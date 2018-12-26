'''
Need to verify that we can simulate locally SHO with uint8
'''

from pylab import *

state = uint8(zeros(3));

'''
Let state[0] be position
let state[1] be velocity
'''

state[0]=255
state[1]=0

'''
Try to simulate these
F = ma = -kx  
Is the basic equation

w^2 = k ( for unit mass )
'''


def clip(x):
    if x<0: x=0
    elif x>255: x=255
    return int(x)

dt = 0.1
k = 14.0
c = 2.0
for i in range(1000):
    dVdt = -k*(state[0]-127)-c*(state[1]-127)
    dXdt = (state[1]-127)
    state[1] = clip(state[1]+dt*dVdt)
    state[0] = clip(state[0]+dt*dXdt)
    #print 'dx=',dXdt,'dv=',dVdt,'Dv=',dt*dVdt,'Dx=',dt*dXdt,'x=',state[0],'v=',state[1]
    print '-'*(state[0]/4)
