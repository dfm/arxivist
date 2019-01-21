(function(){

  // Save the current state of the preferences dictionary
  var executed = false;
  var counter = {};
  var storage = chrome.storage.local;

  // Storage for the word vectors
  var word_vectors = {};

  // Request the current preferences dictionary
  //storage.remove(['ninja'], function(result) {
  //  var error = chrome.runtime.lastError;
  //  if (error) {
  //      console.error(error);
  //  }
  //});
  storage.get(['ninja'], function(result) {
    console.log('Value ninja preferences are: ')
    console.log(result.ninja);
    if (result.ninja) {
      counter = result.ninja;
    } else {
      counter = {};
    }
    executed = true;

    // Compute the distance between the user preferences and these papers
    var scores = [];
    for (var key in word_vectors) {
      var vec = word_vectors[key];
      var score = 0;
      for (var stem in vec) {
        var orig = counter[stem];
        if (orig) score += vec[stem] * orig;
      }
      scores[key] = score;
    }

    // Re-order the ninja divs based on the score
    reorder_divs(scores);
  });

  // This function intercepts clicks and if that click is on an abstract
  // listing, update the user preferences and save it to local storage
  document.onclick = function (e) {
    e = e ||  window.event;
    var element = e.target || e.srcElement;

    if (element.nodeName == 'A') {
      // Check to make sure that the request to local storage executed
      if (!executed) {
        console.log("something went wrong!");
        return true;
      }

      // Find the parent ninja block
      var url = element.href;
      element = element.parentElement;
      while (element && element.getAttribute('class') != 'ninja') {
        element = element.parentElement;
      }

      // If it wasn't found, this was a different link. Proceed
      if (!element || element.getAttribute('class') != 'ninja') {
        return true;
      }

      var arxiv_id = element.id;
      var vec = word_vectors[arxiv_id];
      for (var stem in vec) {
        if (counter[stem]) counter[stem] += vec[stem];
        else counter[stem] = vec[stem]
      }

      // Save the updated results to local storage
      storage.set({ninja: counter}, function() {
        window.location = url;
      });

      return false;
    }
  };

  // Loop over all the visible abstract blocks and tokenize the title and
  // (if available) the abstract into a vector of stemmed word counts
  var compute_word_vectors = function () {
    var blocks = document.getElementsByTagName('dl');
    var I = blocks.length;
    for (i = 0; i < I; ++i) {
      // Extract parts of this block
      var titles = blocks[i].getElementsByTagName('dt');
      var bits = blocks[i].getElementsByTagName('dd');

      // Wrap all the papers in a common block div
      var N = titles.length;
      for (var j = 0; j < N; ++j) {
        var div = document.createElement('div');
        div.appendChild(titles[j]);
        div.appendChild(bits[j]);

        // Work out the arXiv ID
        var arxiv_id = null;
        var links = div.getElementsByTagName('a');
        for (var k = 0; k < links.length; ++k) {
          var link = links[k];
          if (link.title == 'Abstract') {
            arxiv_id = link.innerText;
            break;
          }
        }

        // Add the div back into the list
        div.setAttribute('class', 'ninja');
        div.setAttribute('id', arxiv_id);
        blocks[i].insertBefore(div, titles[j]);

        // Parse the div text for word stems
        var this_counter = {};
        var pars = div.getElementsByClassName('mathjax');
        var L = pars.length;
        for (var l = 0; l < L; ++l) {
          var words = pars[l].innerText.toLowerCase()
                            .replace(/[^\w\s]|_/g, "") // only alphanumeric
                            .replace(/[0-9]/g, "")     // no numbers
                            .split(/\s+/);             // split by whitespace
          var K = words.length;
          for (var k = 0; k < K; ++k) {
            if (!window.stopwords.includes(words[k])) {
              var stem = stemmer(words[k]);
              if (stem.length) {
                if (this_counter[stem]) this_counter[stem] += 1;
                else this_counter[stem] = 1;
              }
            }
          }
        }

        // Update the local list of word vectors
        word_vectors[arxiv_id] = this_counter;
      }
    }
  };

  // Based on the word vectors computed in 'compute_word_vectors', compute
  // the normalized tf-idf representation of each block
  var compute_tf_idf_vectors = function () {
    // Compute idf
    var nd = 0;
    var df = {};
    for (var key in word_vectors) {
      nd += 1;
      for (var stem in word_vectors[key]) {
        if (df[stem]) df[stem] += 1;
        else df[stem] = 1;
      }
    }

    // Compute the tf-idf scores
    for (var key in word_vectors) {
      var vec = word_vectors[key];
      var total = 0;
      for (var stem in word_vectors[key]) {
        var tf_idf = vec[stem] * Math.log(nd / df[stem]);
        vec[stem] = tf_idf;
        total += tf_idf * tf_idf;
      }
      total = Math.sqrt(total);

      // Normalize the vectors
      for (var stem in word_vectors[key]) {
        vec[stem] /= total;
      }
    }
  };

  // Reorder the ninja divs based the preference scores
  var reorder_divs = function (scores) {
    var links = document.getElementsByTagName('a');
    var links_length = links.length;
    var blocks = document.getElementsByTagName('dl');
    var blocks_length = blocks.length
    for (var block_id = 0; block_id < blocks_length; ++block_id) {
      var block = blocks[block_id];
      var divs = block.getElementsByClassName('ninja');
      var old_first_name = divs[0].childNodes[0].childNodes[0].getAttribute('name');
      var divs_length = divs.length;
      var sortable = [];
      for (var div_id = 0; div_id < divs_length; ++div_id) {
        var div = divs[div_id];
        sortable.push([scores[div.id], div]);
      }
      sortable = sortable.sort(function(a, b) { return b[0] - a[0]; });

      // Make sure that the top links are right
      for (var l = 0; l < links_length; ++l) {
        if (links[l].getAttribute('href') == '#' + old_first_name) {
          links[l].setAttribute('href', '#' + sortable[0][1].id);
        }
      }

      // Update the blocks
      var header = document.createElement('div');
      header.innerHTML = '<i>sorted by arxivist</i>';
      header.setAttribute('style', 'padding: 0 0 1em');
      block.appendChild(header);
      for (var div_id = 0; div_id < divs_length; ++div_id) {
        block.appendChild(sortable[div_id][1]);
      }
    }
  };

  compute_word_vectors();
  compute_tf_idf_vectors();

})();
