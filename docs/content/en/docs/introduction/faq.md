---
title: "Frequently Asked Questions"
linkTitle: "FAQ"
weight: 20
---

Below is a collection of frequent questions and the best answers I can give.

### Why do I need Vortex for this?

You don't! If you prefer installing and managing your mods manually, or using any other modding tools, I recommend using them! DGV is just an alternate method of installing mods for those who are more familiar with Vortex already. In particular, installing Days Gone mods manually is not particularly arduous if you are used to it.

### I’m a mod/pack author, how do I make mods compatible with Vortex?

The over-simplified answer is that Vortex works best when a single mod archive (i.e. a file on Nexus Mods) contains just one `.pak` mod file in it. This is usually impractical for many games, so the installer will try to detect and adapt to different mod structures to make installing mods easier, even when they're not packaged how Vortex likes them.

In particular, note that the installer will only deploy `.pak` files (and sometimes any other files in the folder containing those `.pak` files), so anything in other folders shouldn't impact compatibility.

### What about mods that aren't on the Nexus?

They should still work fine! Download the archive file and install it using Vortex's standard "Install from File" button. You might be prompted to choose what files you want installed, and also remember that non-Nexus mods won't have quite the same metadata available in Vortex you might be used to.

### The installer prompt failed and now I can't install my mod?!

If you are facing problems installing mods with multiple `.pak` files, you may have found a problem in the advanced installer that DGV uses to cut down on conflicts. If that's causing issues, **please** raise an issue [on GitHub](https://github.comm/agc93/vortex-daysgone) and make sure to link/include which mod you're trying to install. We're always trying to improve mod compatibility and you might have just found a bug!