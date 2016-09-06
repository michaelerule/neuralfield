#!/usr/bin/python
# -*- coding: UTF-8 -*-
from __future__ import absolute_import
from __future__ import with_statement
from __future__ import division
from __future__ import print_function

'''
Implementation of Wilson-Cowan neural field equations. 

Working toward a model description language that can be compiled to
multiple platforms.

Here is a test description of a model
'''

import traceback
import numpy as np

example_model = '''
pargroup Excitatory
    par Aee // E-E couplng
    par Aie // Excitation of Inhibitory coupling
    par He  // Bias in E cell synaptic input
    par Te  // Excitatory population time constant (ms)
    par ae  // Timescale of excitatory adaptation
    par Ne  // Noise level (uniform) in E cells
    par Se  // Width of excitatory spread
    par be  // Strength of Excitatory adaptation
    par Ge  // Gain on stimulation of e cells

pargroup Inhibitory
    par Ti  // Inhibitory population time constant (ms)
    par Aii // I-I coupling
    par Aei // Inhibition of Excitatory coupling
    par ai  // Timescale of inhibitory adaptation
    par Hi  // Bias in I cell synaptic input
    par Ni  // Noise level (uniform) in I cells
    par Si  // Width of inhibitory spread
    par bi  // Strength of Inhibitory adaptation
    par Gi  // Gain on stimulation of i cells

pargroup Stimulus
    par f
    par A

let Ke GAUSSIAN_KERNEL(Se)
let Ki GAUSSIAN_KERNEL(Si)
let N  GAUSSIAN_NOISE(512,512)

field2d Ue, Ui, Ve, Vi
field2d KeUe = Ke(Ue)
field2d KiUi = Ki(Ui)

var s = Heav(cos(f*t))*A // External stimulation
fun F(x) = (1./(1.+exp(-(x))))

var Ae = F(Aee*KeUe-Aie*KiUi-He+Ge*s-Ve*be+Ne*N);
var Ai = F(Aei*KeUe-Aii*KiUi-Hi+Gi*s-Vi*bi+Ni*N);
update dUe/dt = (Ae - Ue)/Te
update dUi/dt = (Ai - Ui)/Ti
update dVe/dt = (Ue - Ve)/ae
update dVi/dt = (Ui - Vi)/ai

'''

def unicode_range(start=0,stop=0xffff):
    result = u''
    for i in range(start,stop+1):
        result += unichr(i)
    return result

import unicodedata as ud

def remove_invalid(u):
    return ''.join([c for c in u if ud.category(c)!='Cn'])

latin  = unicode_range(65,64+26) + unicode_range(97,96+26)
latin2 = unicode_range(0xC0,0xD6)+unicode_range(0xD8,0xF6)+unicode_range(0xF8,0xFF)
latin3 = unicode_range(0x100,0x17f)
greek  = unicode_range(0x0370,0x0400)
math   = unicode_range(0x1D400,0x1D7cb)
hebrew = unicode_range(0x5d0,0x5ea)
other  = unicode_range(0x2100,0x214f)
letterlike = remove_invalid(latin+latin2+greek+hebrew+math+other)
numberlike = remove_invalid('1234567890'+unicode_range(0x1d7ce,0x1d7ff))

def segment_identifiers(s):
    '''
    break a string into a list of identifiers and operators.
    state-machine approach
    '''
    tokens = []
    in_identifier = 0
    in_number     = 0
    current_token = u''
    def next():
        tokens.append(u''+current_token)
    for i,c in enumerate(s):
        if c in letterlike:
            if in_number:
                raise Exception('invalid identifier: letters after numbers')
            if not in_identifier:
                in_identifier=True
                next()
                current_token = u''
            current_token += c
        elif c in numberlike:
            if not (in_number or in_identifier):
                in_number=True
                next()
                current_token = u''
            current_token += c
        else:
            if in_number or in_identifier:
                in_number=False
                in_identifier=False
                next()
                current_token = u''
            current_token += c
    tokens.append(u''+current_token)
    return tokens

def handle_comment(line):
    comment = ''
    if '//' in line:
        if line.count('//')>1:
            print('Multiple comment symbols, ignoring latter')
        line,comment = [s.strip() for s in line.split('//')[:2]]
    return line,comment

def parse_field2d(line,context):
    '''
    Command to declare a new field variable.
    '''
    RHS  = None
    name = line
    if '=' in line:
        name,RHS = handle_equation(line,context)
    return 'field',(name,RHS)

def check_name(name):
    if name in 'wxyzt':
        raise Exception('Names x,y,z,w,t reserved for coordinates')
    if name in 'WH':
        raise Exception('Names W,H reserved for dimensions')

def parse_par(line,context):
    '''
    Command to parse a parameter
    '''
    check_name(line)
    return 'par',line

def handle_equation(line,context):
    if not line.count('=')==1:  
        raise Exception('need 1 and only 1 equals sign')
    LHS,RHS = [s.strip() for s in line.split('=')]
    if RHS[-1]==';': RHS=RHS[:-1]
    RHS = segment_identifiers(RHS)
    RHS = [context[x] if x in context else x for x in RHS]
    RHS = ''.join(RHS)
    return LHS,RHS

def parse_params(params):
    params = [handle_equation(x,{}) for x in params.split(';') if not x.strip()=='']
    params = {k:eval(v) for (k,v) in params}
    return params

def parse_update(line,context):
    '''
    Command to parse a differential equation
    '''
    LHS,RHS = handle_equation(line,context)
    if not LHS[0].lower=='d' and (LHS.count('/')==1 and LHS.split('/')[0].lower=='d'):
        print('LHS of update equation needs form d[var1]/d[var2]')
    dv1,dv2 = [dv[1:] for dv in LHS.split('/')]
    if not dv2=='t':
        raise Exception('only time derivatives dt supported')
    return 'update',(dv1,dv2,RHS)

def parse_fun(line,context):
    '''
    Command to parse a subroutine function
    '''
    LHS,RHS = handle_equation(line,context)
    name = LHS.split('(')[0].strip()
    check_name(name)
    args = [s.strip() for s in LHS.split('(')[1].split(')')[0].strip().split(',')]
    RHS  = ''.join(RHS.split())
    if RHS[-1]==';': RHS=RHS[:-1]
    return 'subroutine',(name,args,RHS)

def parse_var(line,context):
    '''
    Command to parse an intermediate variable
    '''
    name,RHS = handle_equation(line,context)
    check_name(name)
    return 'var',(name,RHS)

def parse_let(line,context):
    '''
    Command to parse a let statement.
    For now these are just string substitution
    '''
    words = line.split()
    name = words[0]
    RHS = ' '.join(words[1:])
    check_name(name)
    return 'let',(name,RHS)

def parse_model(string):
    '''
    Parse a model description. It is very simplistic

    The language will consist of lines.
    Each line is one statement.
    Each statement begins with a keyword.
    The keyword specifies which function to parse the line
    semicolons, and trailing and leading whitespace are ignored
    comments are supported by // or % or #

    This parser will use eval/exec and therefore is a security risk.
    Do not call this function on strings that have not been verified
    as safe. Later implementations may fix the security issues.

    This 'parsing and compiliation' is nothing more than templating,
    so most coding errors will be caught when the template is compiled
    or interpreted later. 
    '''
    context = {}
    parsed_lines = []
    for lineno,line in enumerate(string.split('\n')):
        line = line.strip()
        if len(line)<1: continue
        line,comment = handle_comment(line)
        words = line.split()
        assert len(words)>=1
        first = words[0]
        # TODO assert first word is valid identifier
        line_parser = 'parse_'+first
        try:
            line_parser = eval(line_parser)  
        except NameError:
            print('Line %d ! The keyword %s is not defined'%(lineno,first))
            continue

        try:
            if first=='let':
                _,(k,v) = line_parser(' '.join(words[1:]),context)
                if k in context:
                    raise Exception('let statement redefines identifier')
                context[k]=v
            else:
                # Let commas indicate repeat application of line parser
                to_parse = ' '.join(words[1:]).split(',')
                parsed = [(line_parser(x.strip(),context),comment) for x in to_parse]
                parsed_lines += parsed
        except Exception as exc:
            print('Line %d: %s'%(lineno,exc))
            print('\t%s'%line)
            return None
    return parsed_lines


if __name__=='__main__':
    parsed_model = parse_model(example_model)
    print('\n'.join([str(x) for x in parsed_model]))
    print('... compiling ...')
    model = compile_to_python(parsed_model)




