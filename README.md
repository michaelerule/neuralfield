# Neural field equations implemented as WebGL shaders

This project builds on the [WebGL examples for GPGPU computing](https://github.com/michaelerule/webgpgpu) to develop in-browser WebGL implementations of Wilson-Cowan style neural field equations. These examples [can be browsed as a website here](https://michaelerule.github.io/neuralfield/). This project is ever in-development; Please open an issue if you'd like a specific stable configuration to demonstrate a particular effect. 

Older version are [here](https://michaelerule.github.io/neuralfield/gpu/wilson_cowan/index.html).
[The most recent WebGL implementation can be found here](https://michaelerule.github.io/neuralfield/gpu/wilson_cowan/wilson_cowan_gpu_v12_zero_boundary_region.html), and should look like this:

[![Screenshot at 2022-11-07 16-37-24](https://user-images.githubusercontent.com/687425/200365734-4fb6722c-bc61-4379-8fb0-67a9be091ce3.png)](https://michaelerule.github.io/neuralfield/gpu/wilson_cowan/wilson_cowan_gpu_v10_reflecting_boundary.html)

This might be a bit slow on some machines, if so, you can try the [original 8-bit WebGL implementation](https://michaelerule.github.io/neuralfield/gpu/wilson_cowan/wilson_cowan_gpu_v01_8bit.html), which is less accurate but friendlier to older hardware/browsers. If your browser doesn't support WebGL, you can try the original [CPU implementation here.](https://michaelerule.github.io/neuralfield/cpu/wilson_cowan/wilson_cowan_cpu_adapt.html)

This project grew out of the following papers, which use these equations to model hallucinations, responses to cortical stimulation, and retinal waves: 

 - [Rule, Michael, Matthew Stoffregen, and Bard Ermentrout. "A model for the origin and properties of flicker-induced geometric phosphenes." PLoS computational biology 7.9 (2011): e1002158.](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1002158)
 - [Heitmann, Stewart, et al. "Optogenetic stimulation shifts the excitability of cerebral cortex from type I to type II: oscillation onset and wave propagation." PLoS computational biology 13.1 (2017): e1005349.](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1005349)
 - [Rule, Michael E., et al. "Neural field models for latent state inference: Application to large-scale neuronal recordings." PLOS Computational Biology 15.11 (2019): e1007442.](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1007442)

Unless otherwise specified, media, text, and rendered outputs are licensed under the [Creative Commons Attribution Share Alike 4.0 license](https://choosealicense.com/licenses/cc-by-sa-4.0/) (CC BY-SA 4.0). Source code is licensed under the [GNU General Public License version 3.0](https://www.gnu.org/copyleft/gpl.html) (GPLv3). 
