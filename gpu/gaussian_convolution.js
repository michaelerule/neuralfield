

// kernels are cached, which saves a bit of time
__$kernels$__={}

function gaussianKernel(sigma) { 
	/* Gausian kernel.
	
	Explicitly normalized to sum to 1, since simply
	evaluating normal PDF at a collection of discrete points
	will not guarantee that the discrete approximation
	sums to 1
	
	We're a little stingy with the number of discrete points
	approximating the kernel. We're favoring speed over 
	accuracy in this case. 
	*/
	if (sigma in __$kernels$__) return __$kernels$__[sigma];
	
	var N      = Math.ceil(sigma*2)*2+1;
	var center = Math.floor(N/2);
    var kernel = new Float32Array(new ArrayBuffer(N*4));
	var sum    = 0.0;
	for (var i=0; i<N; i++) {
		var x = i-center
		kernel[i] = Math.exp(-x*x/(2*sigma*sigma));
		sum += kernel[i];
	}
	var normalization = 1./sum;
	for (var i=0; i<N; i++) kernel[i]*=normalization;

	console.log('kernel length is ',kernel.length);
	
	__$kernels$__[sigma] = kernel;
	return kernel;
}

// I'm not sure caching here will help but I'm going to try it anyway
// it may at least avoid doing a lot of memory allocation every frame?
// although I don't know how expensive memeory allocation really is.

__$normalizers$__ = {};
function compute_normalizer(W,sigma) {
	if (sigma in __$normalizers$__) 
		return __$normalizers$__[sigma];
	console.log('No cached normalizer');
	var kernel = gaussianKernel(sigma);
	var M      = W*W;
    var N      = kernel.length;
    var c      = N>>1;
    var center = M-c;
    var stop   = W+c-N+1;
    // array is larger than needed to simplify indexing in a tight loop
    // later one -- again, not sure this is a good optimization. We'll see. 
    var normalizer = new Float32Array(new ArrayBuffer(W*4));
    var x=0;
    for (;x<c;++x) {
        var sum = 0.0;
        for (var k=c-x; k<N; k++) sum+=kernel[k];
        normalizer[x] = 1.0/sum;
    }
    x=stop
    for (;x<W;++x) {
        var sum = 0.0;
        for (var k=W+c-x; --k;)   sum+=kernel[k];
        normalizer[x] = 1.0/sum;
    }
    __$normalizers$__[sigma]=normalizer;
    return normalizer;
}



function blurGaussianFloat32(buffer,output,temp,W,H,sigma) {
	/* 
	Reference Gaussian Blur implementation. Naive convolution. 
	All optimized implementation should match this.
	*/
	var kernel = gaussianKernel(sigma);
	var N = kernel.length;
	var M = W*H;
	var mask = M-1;
	
	var center = M-Math.floor(N/2)*(1+W);
	for (var y=0;y<H;++y) 
    for (var x=0;x<W;++x) {
	    var i = x+W*y;
		var sum = 0.0;
		for (var l=0; l<N; l++) 
		for (var k=0; k<N; k++) {
			sum += kernel[k]*kernel[l]
				 * buffer[(k+W*l+i+center)&mask];
		}
		temp[i] = sum;
		if (sum>1) console.log(sum);
		if (sum<0) console.log(sum);
    }
	for (var y=0;y<H;++y) 
    for (var x=0;x<W;++x) {
	    var i = x+W*y;
		output[i] = temp[i];
    }
}

function blurGaussianFloat32Separable(buffer,output,temp,W,H,sigma) {
	/* 
    	Execute 2D Gaussian blur with standard deviation sigma over the 
	data "buffer" with dimensions 'w' x 'h'. using the buffer temp which
	is the same size as "buffer". 
	
	This uses separable convoultion approach. 
	This modifies both "in" and "temp" in place.
	
	Bounday conditions are periodic, approximately. Overflow in the X
	direction to the right wraps around to the left on the next line.
	Overflow in the X direction to the left wraps around to the right 
	on the previous line. Overflows in the Y direction wrap normall.
	This approach is used because, for power of two sized arrays, it is
	extremely computationally efficient, and does not alter the behavior
	of the simulation.
	
	It's required that the product of the width and height be a power 
	of 2.
	*/
	
	var kernel = gaussianKernel(sigma);
	var N      = kernel.length;
	var M      = W*H;
	var mask   = M-1;
	var center = M-Math.floor(N/2);
	
	for (var i=0;i<M;++i) {
		var sum = 0.0;
		for (var k=0; k<N; k++)
			sum += kernel[k]*buffer[(k+i+center)&mask];
		temp[i] = sum;
    }
	for (var i=0;i<M;++i) {
		var sum = 0.0;
		for (var k=0; k<N; k++)
			sum += kernel[k]*temp[((k+center)*W+i)&mask];
		output[i] = sum;
    }
}



function blurGaussianFloat32SeparableAnisotropic(buffer,output,temp,W,H,sigmax,sigmay) {
	/* 
    	Execute 2D Gaussian blur with standard deviation sigma over the 
	data "buffer" with dimensions 'w' x 'h'. using the buffer temp which
	is the same size as "buffer". 
	
	This uses separable convoultion approach. 
	This modifies both "in" and "temp" in place.
	
	Bounday conditions are periodic, approximately. Overflow in the X
	direction to the right wraps around to the left on the next line.
	Overflow in the X direction to the left wraps around to the right 
	on the previous line. Overflows in the Y direction wrap normall.
	This approach is used because, for power of two sized arrays, it is
	extremely computationally efficient, and does not alter the behavior
	of the simulation.
	
	It's required that the product of the width and height be a power 
	of 2.
	*/
	
	var M      = W*H;
	var mask   = M-1;
	
    if (sigmax<0.16) for (i=M;--i;) temp[i]=buffer[i];
    else {
	    var kernel = gaussianKernel(sigmax);
	    var N      = kernel.length;
	    var c      = N>>1;
	    var center = M-c;
	    var stop   = W+c-N+1;
	    for (var y=0;y<H;++y) {
	        var Y=W*y;
	        var x=0;
            for (;x<c;++x) {
		        var sum   = 0.0;
		        for (var k=0; k<N; k++) sum+=kernel[k]*buffer[k+x+center+Y&mask];
		        temp[x+Y] = sum;
	        }
            for (;x<stop;++x) {
		        var sum   = 0.0;
		        for (var k=0;   k<N; k++) sum+=kernel[k]*buffer[k+x-c+Y];
		        temp[x+Y] = sum;
	        }
            for (;x<W;++x) {
		        var sum   = 0.0;
		        for (var k=0;k<N;k++)   sum+=kernel[k]*buffer[k+x+center+Y&mask];
		        temp[x+Y] = sum;
	        }
        }
    }
    
    if (sigmay<0.16) for (i=M;--i;) output[i]=temp[i];
    else {
	    var kernel = gaussianKernel(sigmay);
	    var N      = kernel.length;
	    var c      = N>>1;
	    var center = M-c;
	    var stop   = H+c-N+1;
	    var y=0;
	    for (;y<c;++y) for (var x=0;x<W;++x) {
	        var sum = 0.0;
		    for (var k=0; k<N; k++) sum += kernel[k]*temp[((k+y+center)*W+x)&mask];
	        output[x+W*y] = sum;
        }
	    for (;y<stop;++y) for (var x=0;x<W;++x) {
	        var sum = 0.0;
	        for (var k=0; k<N; k++) sum += kernel[k]*temp[x+(k+y-c)*W];
	        output[x+W*y] = sum;
        }
	    for (;y<H;++y) for (var x=0;x<W;++x) {
	        var sum = 0.0;
		    for (var k=0; k<N; k++) sum += kernel[k]*temp[((k+y+center)*W+x)&mask];
	        output[x+W*y] = sum;
        }
    }
}


function blurGaussianFloat32SeparableAnisotropicAbsorbing(buffer,output,temp,W,H,sigmax,sigmay) {
	/* 
    	Execute 2D Gaussian blur with standard deviation sigma over the 
	data "buffer" with dimensions 'w' x 'h'. using the buffer temp which
	is the same size as "buffer". 
	
	This uses separable convoultion approach. 
	This modifies both "in" and "temp" in place.
	
	Bounday conditions are periodic, approximately. Overflow in the X
	direction to the right wraps around to the left on the next line.
	Overflow in the X direction to the left wraps around to the right 
	on the previous line. Overflows in the Y direction wrap normall.
	This approach is used because, for power of two sized arrays, it is
	extremely computationally efficient, and does not alter the behavior
	of the simulation.
	
	It's required that the product of the width and height be a power 
	of 2.
	*/
    var M = W*H;
	
	// blur in x direction
    if (sigmax<0.16) for (i=M;--i;) temp[i]=buffer[i];
    else {
	    var kernel = gaussianKernel(sigmax);
	    var N      = kernel.length;
	    var c      = N>>1;
	    var center = M-c;
	    var stop   = W+c-N+1;
	    for (var y=0;y<H;++y) {
	        var Y=W*y;
	        var x=0;
            for (;x<c;++x) {
		        var sum   = 0.0;
		        for (var k=c-x; k<N; k++) sum+=kernel[k]*buffer[k+x-c+Y];
		        temp[x+Y] = sum;
	        }
            for (;x<stop;++x) {
		        var sum   = 0.0;
		        for (var k=0;   k<N; k++) sum+=kernel[k]*buffer[k+x-c+Y];
		        temp[x+Y] = sum;
	        }
            for (;x<W;++x) {
		        var sum   = 0.0;
		        for (var k=W+c-x; --k;)   sum+=kernel[k]*buffer[k+x-c+Y];
		        temp[x+Y] = sum;
	        }
        }
    }
    
    // blur in y direction
    if (sigmay<0.16) for (i=M;--i;) output[i]=temp[i];
    else {
	    var kernel = gaussianKernel(sigmay);
	    var N      = kernel.length;
	    var c      = N>>1;
	    var center = M-c;
	    var stop   = H+c-N+1;
	    var y=0;
	    for (;y<c;++y) for (var x=0;x<W;++x) {
	        var sum = 0.0;
	        for (var k=c-y; k<N; k++) sum += kernel[k]*temp[x+(k+y-c)*W];
	        output[x+W*y] = sum;
        }
	    for (;y<stop;++y) for (var x=0;x<W;++x) {
	        var sum = 0.0;
	        for (var k=0; k<N; k++) sum += kernel[k]*temp[x+(k+y-c)*W];
	        output[x+W*y] = sum;
        }
	    for (;y<H;++y) for (var x=0;x<W;++x) {
	        var sum = 0.0;
	        for (var k=W+c-y; --k;) sum += kernel[k]*temp[x+(k+y-c)*W];
	        output[x+W*y] = sum;
        }
    }
}


function blurGaussianFloat32SeparableAnisotropicAbsorbingRenormalizing(buffer,output,temp,W,H,sigmax,sigmay) {
	/* 
    	Execute 2D Gaussian blur with standard deviation sigma over the 
	data "buffer" with dimensions 'w' x 'h'. using the buffer temp which
	is the same size as "buffer". 
	
	This uses separable convoultion approach. 
	This modifies both "in" and "temp" in place.
	
	Bounday conditions are periodic, approximately. Overflow in the X
	direction to the right wraps around to the left on the next line.
	Overflow in the X direction to the left wraps around to the right 
	on the previous line. Overflows in the Y direction wrap normall.
	This approach is used because, for power of two sized arrays, it is
	extremely computationally efficient, and does not alter the behavior
	of the simulation.
	
	It's required that the product of the width and height be a power 
	of 2.
	*/
    var M = W*H;
	
	// blur in x direction
    if (sigmax<0.16) for (i=M;--i;) temp[i]=buffer[i];
    else {
	    var kernel = gaussianKernel(sigmax);
	    var N      = kernel.length;
	    var c      = N>>1;
	    var center = M-c;
	    var stop   = W+c-N+1;
	    
	    // hack for performance, lazy code
	    var normalizer = new Float32Array(new ArrayBuffer(W*4));
        var x=0;
        for (;x<c;++x) {
	        var sum = 0.0;
	        for (var k=c-x; k<N; k++) sum+=kernel[k];
	        normalizer[x] = 1.0/sum;
        }
        x=stop
        for (;x<W;++x) {
	        var sum = 0.0;
	        for (var k=W+c-x; --k;)   sum+=kernel[k];
	        normalizer[x] = 1.0/sum;
        }
        
        var x=0;
	    for (var y=0;y<H;++y) {
	        var Y=W*y;
	        var x=0;
            for (;x<c;++x) {
		        var sum = 0.0;
		        for (var k=c-x; k<N; k++) sum+=kernel[k]*buffer[k+x-c+Y];
		        temp[x+Y] = sum*normalizer[x];
	        }
            for (;x<stop;++x) {
		        var sum = 0.0;
		        for (var k=0;   k<N; k++) sum+=kernel[k]*buffer[k+x-c+Y];
		        temp[x+Y] = sum;
	        }
            for (;x<W;++x) {
		        var sum = 0.0;
		        for (var k=W+c-x; --k;)   sum+=kernel[k]*buffer[k+x-c+Y];
		        temp[x+Y] = sum*normalizer[x];
	        }
        }
    }
    
    // blur in y direction
    if (sigmay<0.16) for (i=M;--i;) output[i]=temp[i];
    else {
	    var kernel = gaussianKernel(sigmay);
	    var N      = kernel.length;
	    var c      = N>>1;
	    var center = M-c;
	    var stop   = H+c-N+1;
	    
	    
	    // hack for performance, lazy code
	    var normalizer = new Float32Array(new ArrayBuffer(W*4));
	    var y=0;
	    for (;y<c;++y) for (var x=0;x<W;++x) {
	        var sum = 0.0;
	        for (var k=c-y; k<N; k++) sum += kernel[k];
	        normalizer[y] = 1.0/sum;
        }
	    for (y=stop;y<H;++y) for (var x=0;x<W;++x) {
	        var sum = 0.0;
	        for (var k=H+c-y; --k;) sum += kernel[k];
	        normalizer[y] = 1.0/sum;
        }
        
	    var y=0;
	    for (;y<c;++y) for (var x=0;x<W;++x) {
	        var sum = 0.0;
	        for (var k=c-y; k<N; k++) sum += kernel[k]*temp[x+(k+y-c)*W];
	        output[x+W*y] = sum*normalizer[y];
        }
	    for (;y<stop;++y) for (var x=0;x<W;++x) {
	        var sum = 0.0;
	        for (var k=0; k<N; k++) sum += kernel[k]*temp[x+(k+y-c)*W];
	        output[x+W*y] = sum;
        }
	    for (;y<H;++y) for (var x=0;x<W;++x) {
	        var sum = 0.0;
	        for (var k=W+c-y; --k;) sum += kernel[k]*temp[x+(k+y-c)*W];
	        output[x+W*y] = sum*normalizer[y];
        }
    }
}


function blurGaussianFloat32SeparableAnisotropicAbsorbingRenormalizingPowerOfTwoSize(buffer,output,temp,W,H,sigmax,sigmay) {
	/* 
    	Execute 2D Gaussian blur with standard deviation sigma over the 
	data "buffer" with dimensions 'w' x 'h'. using the buffer temp which
	is the same size as "buffer". 
	
	This uses separable convoultion approach. 
	This modifies both "in" and "temp" in place.
	
	Bounday conditions are periodic, approximately. Overflow in the X
	direction to the right wraps around to the left on the next line.
	Overflow in the X direction to the left wraps around to the right 
	on the previous line. Overflows in the Y direction wrap normall.
	This approach is used because, for power of two sized arrays, it is
	extremely computationally efficient, and does not alter the behavior
	of the simulation.
	
	It's required that the product of the width and height be a power 
	of 2.
	*/
    var M = W*H;

    var shifter=1;
    while ((1<<shifter)<W) shifter++;	

	// check for degenerate case
	if (sigmax<0.16&&sigmay<0.16) {
    		for (var i=0;i<M;i++)
    			output[i]=buffer[i];
		return;
	}

    
	// blur in x direction
    if (sigmax<0.16) 
		for (var y=0; y<H; y++)
			for (var x=0; x<W; x++)
				temp[(x<<shifter)+y]=buffer[(y<<shifter)+x];
    else {
	    var kernel = gaussianKernel(sigmax);
	    var N      = kernel.length;
	    var L      = N-1;
	    var c      = N>>1;
	    var center = M-c;
	    var stop   = W+c-N+1;
	    var Wc     = W+c;
	    var normalizer = compute_normalizer(W,sigma);
	    
    		var y  = 0;
        var Y  = 0;
        var cY = -c;
	    for (;y<H;++y,Y+=W,cY+=W) {
	        var x   = 0;
	        var xcY = cY;
	        var Z   = y;
            for (;x<c;++x,++xcY,Z+=W) {
		        var sum = 0.0;
		        for (var k=c-x;k<N;k++) sum+=kernel[k]*buffer[k+xcY];
		        temp[Z] = sum*normalizer[x];
	        }
	        /*
            for (;x<stop;++x,++xcY,Z+=W) {
		        var sum = kernel[c]*buffer[c+xcY];
		        for (var k=0;k<c;k++) sum+=kernel[k]*(buffer[k+xcY]+buffer[L-k+xcY]);
		        temp[Z] = sum;
	        }*/
        for (;x<stop;++x,++xcY,Z+=W) {
	        var sum = 0.0;
	        for (var k=0;   k<N; k++) sum+=kernel[k]*buffer[k+xcY];
	        temp[Z] = sum;
        }
	        
            for (;x<W;++x,++xcY,Z+=W) {
		        var sum = 0.0;
		        for (var k=Wc-x;--k;)   sum+=kernel[k]*buffer[k+xcY];
		        temp[Z] = sum*normalizer[x];
	        }
        }
    }
    
    // blur in y direction
    if (sigmay<0.16) 
		for (var y=0; y<H; y++)
			for (var x=0; x<W; x++)
				output[(x<<shifter)+y]=temp[(y<<shifter)+x];
    else {
	    var kernel = gaussianKernel(sigmay);
	    var N      = kernel.length;
	    var L      = N-1;
	    var c      = N>>1;
	    var center = M-c;
	    var stop   = H+c-N+1;
	    var Wc     = W+c;
	    var normalizer = compute_normalizer(W,sigma);
        var X = 0;
        var x = 0;
        var Y = -c;
        for (;x<W;++x,X+=W,Y+=W) {
	        var y = 0;
            var Z = y;
	        for (;y<c;++y,++Y,Z+=W) {
                var sum = 0.0;
                for (var k=c-y;k<N;k++) sum+=kernel[k]*temp[k+Y];
                output[Z] = sum*normalizer[y];
            }
            /*
	        for (;y<stop;++y,++Y,Z+=W) {
                var sum = kernel[c]*temp[c+Y];
                for (var k=0;k<c;k++) sum+=kernel[k]*(temp[k+Y]+temp[L-k+Y]);
                output[Z] = sum;
            }
            */
        for (;y<stop;++y,++Y,Z+=W) {
            var sum = 0.0;
            for (var k=0;k<N;k++)   sum+=kernel[k]*temp[k+Y];
            output[Z] = sum;
        }
	        for (;y<H;++y,++Y,Z+=W) {
                var sum = 0.0;
                for (var k=Wc-y;--k;) sum+=kernel[k]*temp[k+Y];
                output[Z] = sum*normalizer[y];
            }
        }
    }
}





function blurGaussianFloat32SeparableAnisotropicAbsorbingRenormalizingPowerOfTwoSize(buffer,output,temp,W,H,sigma) {
	/* 
    	Execute 2D Gaussian blur with standard deviation sigma over the 
	data "buffer" with dimensions 'w' x 'h'. using the buffer temp which
	is the same size as "buffer". 
	
	This uses separable convoultion approach. 
	This modifies both "in" and "temp" in place.
	
	Bounday conditions are periodic, approximately. Overflow in the X
	direction to the right wraps around to the left on the next line.
	Overflow in the X direction to the left wraps around to the right 
	on the previous line. Overflows in the Y direction wrap normall.
	This approach is used because, for power of two sized arrays, it is
	extremely computationally efficient, and does not alter the behavior
	of the simulation.
	
	It's required that the product of the width and height be a power 
	of 2.
	*/
    var M = W*H;

    var shifter=1;
    while ((1<<shifter)<W) shifter++;	

	// check for degenerate case
	if (sigma<0.16) {
    		for (var i=0;i<M;i++)
    			output[i]=buffer[i];
		return;
	}

    
	// blur in x direction
    var kernel = gaussianKernel(sigma);
    var N      = kernel.length;
    var L      = N-1;
    var c      = N>>1;
    var center = M-c;
    var stop   = W+c-N+1;
    var Wc     = W+c;
    var normalizer = compute_normalizer(W,sigma);
    // blur x
    var x=0;
    for (var y=0;y<H;++y) {
        var Y=y<<shifter;
        var x=0;
        var cY = Y-c;
        var xcY = x+cY;
        var Z = y;
        for (;x<c;++x,++xcY,Z+=W) {
	        var sum = 0.0;
	        for (var k=c-x; k<N; k++) sum+=kernel[k]*buffer[k+xcY];
	        temp[Z] = sum*normalizer[x];
        }
        
        for (;x<stop;++x,++xcY,Z+=W) {
	        var sum = 0.0;
	        for (var k=0;   k<N; k++) sum+=kernel[k]*buffer[k+xcY];
	        temp[Z] = sum;
        }
        /*
        for (;x<stop;++x,++xcY,Z+=W) {
	        var sum = kernel[c]*buffer[c+xcY];
	        for (var k=0;k<c;k++) sum+=kernel[k]*(buffer[k+xcY]+buffer[L-k+xcY]);
	        temp[Z] = sum;
        }
        */
        for (;x<W;++x,++xcY,Z+=W) {
	        var sum = 0.0;
	        for (var k=Wc-x; --k;)   sum+=kernel[k]*buffer[k+xcY];
	        temp[Z] = sum*normalizer[x];
        }
    }
    // blur y
    for (var x=0;x<W;++x) {
        var y = 0;
        var X = x<<shifter;
        var Y = y-c+X;
        var Z = x;
        for (;y<c;++y,++Y,Z+=W) {
            var sum = 0.0;
            for (var k=c-y;k<N;k++) sum+=kernel[k]*temp[k+Y];
            output[Z] = sum*normalizer[y];
        }
        
        for (;y<stop;++y,++Y,Z+=W) {
            var sum = 0.0;
            for (var k=0;k<N;k++)   sum+=kernel[k]*temp[k+Y];
            output[Z] = sum;
        }
        /*
        for (;y<stop;++y,++Y,Z+=W) {
            var sum = kernel[c]*temp[c+Y];
            for (var k=0;k<c;k++) sum+=kernel[k]*(temp[k+Y]+temp[L-k+Y]);
            output[Z] = sum;
        }
        */
        for (;y<H;++y,++Y,Z+=W) {
            var sum = 0.0;
            for (var k=Wc-y;--k;)   sum+=kernel[k]*temp[k+Y];
            output[Z] = sum*normalizer[y];
        }
    }
}






