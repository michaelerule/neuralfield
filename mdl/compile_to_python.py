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
import neurotools.nlab as nl
import neurotools.models.wilson_cowan.parsemodel as parse
import neurotools.graphics.matplotlib as Gm
import neurotools.graphics.pygame     as Gp
import pygame
import pygame.gfxdraw
import numpy as np

header = '''
from scipy.signal import convolve2d
from numpy import *
import time
import neurotools.graphics.pygame     as Gp
import pygame
import pygame.gfxdraw

def GAUSSIAN_NOISE(W,H):
    return np.random.randn(W,H)

def GAUSSIAN_KERNEL(s):
    """
    Generate function
    """
    radius = int(np.ceil(3.*s))
    width  = 2*radius+1
    kernel = np.zeros((width,),'float32')
    kernel = np.exp(-(arange(-radius,radius+1)/float(s))**2)
    kernel /= np.sum(kernel)
    def convolve_data(data):
        w,h  = data.shape
        temp = np.zeros((w,h),'float32')
        out  = np.zeros((w,h),'float32')
        for y in xrange(h):
            temp[y,:] = np.convolve(data[y,:], kernel, mode='same')
        for x in xrange(w):
            out[:,x] = np.convolve(temp[:,x], kernel, mode='same')
        return out
    return convolve_data

def Heav(x):
    if x>0: return 1
    if x<0: return 0
    return 0.5
'''

footer = '''
W,H = 512,512

state = init(W,H)

for k in state.keys():
    state[k][...] = np.random.rand(W,H)

params = 'Aii=20;Aie=20;Ti=8;Hi=0;Gi=0.3;Si=1.5;Ni=0;ai=50;\
bi=0;Aee=13.98;Aei=10;Te=4;He=1.54;Ge=0.6;Se=0.8;Ne=1;ae=50;\
be=1;dt=2;display_every=1;Amp=0;Sb=0.1;f=0;A=0;'
params = parse.parse_params(params)
print(params)

data = np.random.uniform(0,1,(W,H,3))

screen = Gp.start(W,H,'Pygame')
show()

dt = 2
t = 0

for i in xrange(50):
    step(dt,t,state,params)
    t += dt
    print(t)
    data[...,0] = state['Ue']
    data[...,1] = state['Ui']
    data[...,2] = abs(state['Ue']-state['Ui'])
    Gp.draw_array(screen,data)
    time.sleep(0.1)    
nl.wait()
pygame.quit()
'''

def compile_to_python(parsed_model):
    '''
    Put together some python code for executing.
    '''

    init = ['state={}']    
    
    for ((k,L),c) in parsed_model:
        if k=='field':
            name,RHS = L
            init.append("state['%s'] = np.zeros((W,H),'float32')"%name)
    init+=['return state']
    init = 'def init(W,H):\n\t'+'\n\t'.join(init)

    # state update
    # version with broadcasting
    steps = []
    for ((k,L),c) in parsed_model:
        if k=='par':
            name = L
            steps.append('%(name)s=params["%(name)s"]'%locals())
    for ((k,L),c) in parsed_model:
        if k=='field':
            name,RHS = L
            steps.append('%(name)s=state["%(name)s"];'%locals())
            if not RHS is None:
                # field is defined in terms of other fields
                steps.append('%(name)s[...]=%(RHS)s'%locals())
    for ((k,L),c) in parsed_model:
        if k=='var':
            name,RHS = L
            steps.append('%s=%s;'%(name,RHS))
    outputs = []
    for ((k,L),c) in parsed_model:
        if k=='update':
            v1,_,RHS = L
            outputs.append((v1,RHS))
    for v,RHS in outputs:
        steps.append('%(v)s_out=%(v)s + dt*(%(RHS)s);'%locals())
    for v,RHS in outputs:
        steps.append('state["%(v)s"][...]=%(v)s_out;'%locals())
    
    subroutines = []
    for ((k,L),c) in parsed_model:
        if k=='subroutine':
            (name,args,RHS) = L
            source = 'def %s(%s):\n\t\treturn %s\n'%(name,','.join(args),RHS)
            subroutines.append(source)

    steps = subroutines + steps
    step_source = 'def step(dt,t,state,params):\n\t'+'\n\t'.join(steps)
    step = step_source
    
    model = '\n\n'.join([header,init,step,footer])
    return model


if __name__=='__main__':
    parsed_model = parse.parse_model(parse.example_model)
    model = compile_to_python(parsed_model)
    print(model)







