#!/usr/bin/python
# -*- coding: UTF-8 -*-
from __future__ import absolute_import
from __future__ import with_statement
from __future__ import division
from __future__ import print_function

'''
Testing code 
'''

from pylab import *
from scipy.signal import convolve2d
from numpy import *
import time
import neurotools.graphics.pygame     as Gp
import pygame
import pygame.gfxdraw

def GAUSSIAN_NOISE(W,H):
    return np.random.rand(W,H)

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

def init(W,H):
	state={}
	state['Ue'] = np.zeros((W,H),'float32')
	state['Ui'] = np.zeros((W,H),'float32')
	state['Ve'] = np.zeros((W,H),'float32')
	state['Vi'] = np.zeros((W,H),'float32')
	state['KeUe'] = np.zeros((W,H),'float32')
	state['KiUi'] = np.zeros((W,H),'float32')
	return state

Ke = GAUSSIAN_KERNEL(1.8)
Ki = GAUSSIAN_KERNEL(2)
def F(x):
	return (1./(1.+exp(-(x))))

Aee = 15
Aei = 10
Aii = 35
Aie = 35
He  = 2.02

def step(dt,t,state,params):
	Ue=state["Ue"];
	Ui=state["Ui"];
	Ve=state["Ve"];
	Vi=state["Vi"];
	KeUe=Ke(Ue)
	KiUi=Ki(Ui)
	Ae=F(Aee*KeUe-Aei*KiUi-He-Ve);
	Ai=F(Aie*KeUe-Aii*KiUi);
	Ue_out=Ue + dt*((Ae - Ue)/4.);
	Ui_out=Ui + dt*((Ai - Ui)/8.);
	Ve_out=Ve + dt*((Ue - Ve)/50.);
	state["Ue"]=Ue_out;
	state["Ui"]=Ui_out;
	state["Ve"]=Ve_out;

close('all')
figure('phaseplane')
points = linspace(0,1,256)
grid = points[:,None]+1j*points[None,:]
Ue = grid.real
Ui = grid.imag
dUe = F(Aee*Ue-Aei*Ui-He-Ue)-Ue
dUi = F(Aii*Ue-Aie*Ui)-Ui
contour(Ue,Ui,dUe,[0],colors=[(0.,1.,0.)])
contour(Ue,Ui,dUi,[0],colors=[(1.,0.5,0)])
K=10
quiver(Ue[::K,::K],Ui[::K,::K],dUe[::K,::K],dUi[::K,::K])
gca().set_aspect('equal', adjustable='box')


W,H = 256,256
state = init(W,H)

for k in state.keys():
    state[k][...] = np.random.rand(W,H)

data = np.random.uniform(0,1,(W,H,3))
screen = Gp.start(W,H,'Pygame')

show()
dt = 2
t = 0
for i in xrange(150):
    step(dt,t,state,{})
    t += dt
    step(dt,t,state,{})
    t += dt
    step(dt,t,state,{})
    t += dt
    step(dt,t,state,{})
    t += dt
    step(dt,t,state,{})
    t += dt
    print(t)
    data[...,0] = state['Ue']
    data[...,1] = state['Ui']
    data[...,2] = abs(state['Ue']-state['Ui'])*3.
    Gp.draw_array(screen,data)
    time.sleep(0.1)    
nl.wait()
pygame.quit()


