// ==UserScript==
// @name         arxiv.ninja
// @description  reorder papers on arXiv new pages
// @version      0.1.1
// @include      https://arxiv.org/list/*/new*
// @grant        none
// ==/UserScript==

// Iain Murray, August 2018

(function(){
    var links = document.getElementsByTagName('a');
    var blocks = document.getElementsByTagName('dl');
    var i = blocks.length;
    while (i--) {
        // Extract parts of this block
        var titles = blocks[i].getElementsByTagName('dt');
        var bits = blocks[i].getElementsByTagName('dd');
        var old_first_name = titles[0].childNodes[0].getAttribute('name');
    
        // Randomly shuffle the papers within this block
        var N = titles.length;
        for (var j=0; j<N; j++) {
            var idx = j + Math.floor(Math.random() * (N - j));
            blocks[i].insertBefore(bits[idx], titles[0]);
            blocks[i].insertBefore(titles[idx], bits[0]);
        }
    
        // Re-write within-page links to still point to the top of the block
        var new_first_name = titles[0].childNodes[0].getAttribute('name');
        var nl = links.length;
        while (nl--) {
            if (links[nl].getAttribute('href') == '#' + old_first_name) {
                links[nl].setAttribute('href', '#' + new_first_name);
            }
        }
    }
})();
