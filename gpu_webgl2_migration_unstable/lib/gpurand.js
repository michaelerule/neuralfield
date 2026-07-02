/**
 * Pseudorandom number generation is costly. This buids an object
 * that can be re-seeded with the stronger Math.random(), but also
 * has a method "uint8" that returns a random 8 bit int using a much
 * weaker random number generator. You can intermittently re-seed
 * the weak RNG with the strong RNG to get a good trade-off in
 * randomness vs performance.
 * @returns {object} - an object with methods seed and uint8
 */
function WeakRNG() {
    var rng = {};
    var rand = Math.floor(Math.random()*0x1000000);
    rng.seed = function() {
        return rand = Math.floor(Math.random()*0x1000000);}
    rng.uint8 = function() {
        return (rand^=rand>>2^rand<<1)&0xff;}
    rng.uniform = function() {
        return ((rand^=rand>>2^rand<<1)&0xff)*0.00392156862745098;}
    return rng;
}

/**
 * Place random RGB data into the main texture of a framebuffer.
 * @param framebuffer {object} - must contain
 *      framebuffer.texture a gl texture created with newTexture
 *      framebbuffer.gl a raster GL context
 */
function GPUNoise(gl) {
    var isGL2 = !!gl.texStorage2D; 
    var modernNoiseSource = 
     "uniform float seed;\n"
    +"float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7) + seed)) * 43758.5453123); }\n"
    +"void main() {\n"
    +"    vec2 uv = gl_FragCoord.xy;\n"
    +"    fragColor = vec4(hash(uv + 0.1), hash(uv + 0.2), hash(uv + 0.3), hash(uv + 0.4));\n"
    +"}\n";
    var legacyNoiseSource = 
     "#define XY gl_FragCoord.xy\n"
    +"uniform   sampler2D data;\n"
    +"void main() {\n"
    +"    vec2 scale = 1./vec2(W,H);\n"
    +"    vec4 c0 = texture2D(data,(XY+vec2( 0, 0))*scale);\n"
    +"    vec4 c1 = texture2D(data,(XY+vec2( 0, 1))*scale);\n"
    +"    vec4 c2 = texture2D(data,(XY+vec2( 1, 0))*scale);\n"
    +"    vec4 c3 = texture2D(data,(XY+vec2(-1, 0))*scale);\n"
    +"    vec4 c4 = texture2D(data,(XY+vec2( 0,-1))*scale);\n"
    +"    gl_FragColor = mod(exp(c0*c1+c2+c3+c4)*sqrt(15193.), 1.0);\n"
    +"}\n";
    var prog = buildRasterProgram(gl, isGL2 ? modernNoiseSource : legacyNoiseSource);
    var copy = buildRasterProgram(gl,
     "uniform sampler2D data;\n"
    +"void main() {\n"
    +"  gl_FragColor = texture2D(data,gl_FragCoord.xy/vec2(W,H));\n"
    +"}\n");
    function randomize(framebuffer) {
        var gl = framebuffer.gl;
        var texture = framebuffer.texture;
        var W = texture.width;
        var H = texture.height;
        var L = 4*W*H;
        // TODO: not good?
        var isFloat = texture.params&&texture.params['format']!==undefined&&(texture.params['format']===gl.RGBA32F||texture.params['format']===gl.RGBA16F);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        if (isFloat) {
            var noise = new Float32Array(L);
            var rng = WeakRNG();
            for (var i = 0; i < L; ++i) noise[i] = rng.uniform();
            gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,W,H,gl.RGBA,gl.FLOAT,noise);
        } else {
            var noise = new Uint8Array(L);
            var rng = WeakRNG();
            for (var i=0;i<L;++i) noise[i] = rng.uint8();
            gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,noise);
        }
        gl.bindTexture(gl.TEXTURE_2D, null);
    };
    /*
    function randomize(framebuffer) {
        var gl = framebuffer.gl;
        var texture = framebuffer.texture;
        var W = texture.width;
        var H = texture.height;
        var L = 4*W*H;
        var noise  = new Uint8Array(L);
        var rng = WeakRNG();
        for (var i=0;i<L;++i)
            noise[i] = rng.uint8();
        //console.log(texture);
        gl.bindTexture  (gl.TEXTURE_2D, texture);
        gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,noise);
    };
    */
    function gpu(data,temp) {
        if (isGL2) {
            prog({seed: Math.random() * 100.0}, temp);
            copy({data:temp}, data);
        } else {
            console.log('1');
            prog({data:data},temp);
            copy({data:temp},data);
        }
    };
    /*
    function gpu(data,temp) {
        //randomize(data);
        prog({data:data},temp);
        copy({data:temp},data);
    };
    */
    gpu.gl = gl;
    gpu.randomize = randomize;
    return gpu;
}

function GPUBoxMuller(gl) {
    var __source__ =
     "#define tau 6.283185307179586\n"
    +"uniform sampler2D noise;\n"
    +"uniform float     sigma;\n"
    +"void main() {\n"
    +"    vec4 n  = texture2D(noise,gl_FragCoord.xy/vec2(W,H));\n"
    +"    vec2 R  = sqrt(-2.*log(n.rb));\n"
    +"    vec2 T  = tau*n.ga;\n"
    +"    gl_FragColor = vec4(R*cos(T),R*sin(T))*sigma;\n"
    +"}\n";

    var prog = buildRasterProgram(gl,__source__);
    function gpu(indata,outdata,sigma) {
        prog( {sigma:sigma, noise:indata}, outdata );
    };
    gpu.gl = gl;
    return gpu;
}
