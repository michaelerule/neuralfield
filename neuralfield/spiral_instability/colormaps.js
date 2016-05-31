
function colormap1() { 
    /*
	#########################################################################
    Generate the colormap, in a format that we can
    access quckly for rapid rendering. Javascript canvas takes pixes in
    byte-packed ABGR 32 bit integers, so we store the color map as BGR here.
    */
    var colormap_BGR = [
        28,65564,131101,196638,327711,393504,459040,524577,655650,721187,
        786980,918052,983589,1049126,1114663,1245992,1311528,1442601,
        1573930,1770794,1967658,2164523,2361387,2558252,2755116,2951980,
        3083309,3279917,3476782,3673646,3870511,4067375,4264239,4461104,
        4657968,4854832,5051696,5248816,5511216,5708079,5904943,6101807,
        6298671,6561327,6758191,6955054,7151918,7414318,7611438,7808302,
        8005166,8202029,8399149,8596012,8727595,8924458,9056042,9253161,
        9384488,9581607,9712935,9910054,0x993925,0x9c3a24,0x9f3c24,0xa13d23,
        0xa43f22,0xa64121,0xa84221,0xaa4420,0xab461f,0xad481e,0xae4a1d,
        0xaf4c1c,0xb04e1b,0xb15019,0xb35218,0xb45417,0xb55616,0xb65815,
        0xb75a14,0xb95c13,0xba5e12,0xbb6011,0xbd6210,0xbd640f,0xbe660e,
        0xbd680e,0xbd6a0d,0xbd6d0c,0xbd6f0c,0xbc710b,0xbc730a,0xbc7509,
        0xbc7709,0xbc7908,0xbb7b07,0xbb7d06,0xbb7f06,0xbb8205,0xbb8404,
        0xbb8604,0xba8803,0xb98a03,0xb88c03,0xb78d03,0xb58f04,0xb49104,
        0xb39304,0xb29504,0xb09605,0xaf9805,0xae9a05,0xad9c05,0xab9e06,
        0xaa9f06,0xa9a106,0xa8a306,0xa6a506,0xa5a707,0xa4a808,0xa2a909,
        0xa0aa0b,0x9fac0d,0x9dad0e,0x9bae10,0x9aaf11,0x98b113,9875988,
        9810710,9679895,9549337,9484058,9353244,9222429,9157407,9026593,
        8895523,8830245,8699432,8633899,8503086,8437808,8306739,8241461,
        8110392,8045115,7914301,7848768,7717955,7652677,7521608,7390795,
        7325261,7259985,7194452,7128919,7063642,6998109,6932577,6867044,
        6736231,6670698,6605165,6539633,6474356,6408823,6343290,6277757,
        6212481,6146948,6081415,6081418,6081677,6016144,6016147,5950614,
        5950873,5885340,5885343,5819810,5820069,5820072,5754539,5754542,
        5689265,5689268,5689271,5689529,5689531,5689790,5689792,5690050,
        5690052,5755847,5755849,5756107,5756109,5756367,5821906,5822164,
        5822422,5822425,5822683,5888221,5888478,5954272,6020065,6020322,
        6086116,6151653,6217446,6217704,6283497,6349290,6349548,6415341,
        6481134,6546672,6546929,6612722,6678516,6744308,6810101,6875894,
        6941686,7007735,7073528,7139320,7205113,7270905,7402234,7468027,
        7533819,7599612,7665405,7731453,7797246,7862782,7928575,7994111,
        8125439,8190974,8256510,8322046,8387839,8453375,8518911,8650238,
        8715774,8781310,8846847,8912639,8978175,9109246,9109246 ];
    var colormap_colors = new Uint32Array(new ArrayBuffer(256*4));
    for (var i=0; i<256; i++) colormap_colors[i] = colormap_BGR[i]|0xff000000;
    return colormap_colors;
}
