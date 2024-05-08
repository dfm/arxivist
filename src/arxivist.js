(function(){

  // Check to see if we're currently on an abstract page or not
  var page_url = new URL(window.location.href).pathname;
  var is_abstract_page = page_url.startsWith("/abs");

  // ============================================
  // Global variables for storage and preferences
  // ============================================
  var executed = false;
  var arxivist_prefs = {};
  var arxivist_ids = [];
  var store;
  if (chrome) {
    store = chrome.storage.local;
  } else {
    store = storage.local;
  }

  //store.clear(function() {
  //  var error = chrome.runtime.lastError;
  //  if (error) {
  //    console.error(error);
  //  }
  //});

  // =========
  // Functions
  // =========

  // Compute the cosine distance between a preferences vector and an array of
  // tf-idf word vectors for the documents
  var get_scores_for_word_vectors = function (prefs, word_vectors) {
    // Compute the distance between the user preferences and these papers
    var scores = [];
    for (var key in word_vectors) {
      var vec = word_vectors[key];
      var score = 0;
      for (var stem in vec) {
        var orig = arxivist_prefs[stem];
        if (orig) score += vec[stem] * orig;
      }
      scores[key] = score;
    }
    return scores;
  };

  // Update the preferences based on an arxiv_id/word vector pair
  var update_prefs = function (arxiv_id, word_vector, has_abstract) {
    // If this paper has already been saved, skip it
    if (arxivist_ids.includes(arxiv_id)) {
      return;
    }
    if (has_abstract) {
      arxivist_ids.push(arxiv_id);
    }

    // Update the preferences for one word vector
    for (var stem in word_vector) {
      if (arxivist_prefs[stem]) arxivist_prefs[stem] += word_vector[stem];
      else arxivist_prefs[stem] = word_vector[stem]
    }

    // Save the updated results to local storage
    store.set({arxivist_prefs: arxivist_prefs, arxivist_ids: arxivist_ids}, function(){});
  };

  var get_word_vector_for_block = function (block) {
    // Parse the div text for word stems
    var word_vector = {};
    var pars = block.getElementsByClassName('mathjax');
    var L = pars.length;
    var has_abstract = false;
    for (var l = 0; l < L; ++l) {
      if (pars[l].nodeName == 'P') has_abstract = true;
      var words = pars[l].innerText.toLowerCase()
                         .replace(/[^\w\s]|_/g, "") // only alphanumeric
                         .replace(/[0-9]/g, "")     // no numbers
                         .split(/\s+/);             // split by whitespace
      var K = words.length;
      for (var k = 0; k < K; ++k) {
        if (!window.stopwords.includes(words[k])) {
          var stem = stemmer(words[k]);
          if (stem.length) {
            if (word_vector[stem]) word_vector[stem] += 1;
            else word_vector[stem] = 1;
          }
        }
      }
    }
    return [word_vector, has_abstract];
  };

  // Loop over all the visible abstract blocks and tokenize the title and
  // (if available) the abstract into a vector of stemmed word counts
  var compute_word_vectors = function () {
    var word_vectors = {};
    var has_abstract = {};
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
        div.setAttribute('class', 'arxivist');
        div.setAttribute('id', arxiv_id);
        blocks[i].insertBefore(div, titles[j]);

        // Update the local list of word vectors
        var res = get_word_vector_for_block(div);
        word_vectors[arxiv_id] = res[0];
        has_abstract[arxiv_id] = res[1];
      }
    }

    return [word_vectors, has_abstract];
  };

  // Based on the word vectors computed in 'compute_word_vectors', compute
  // the normalized tf-idf representation of each block. Note that this update
  // is performed *in place*
  var compute_tf_idf_vectors = function (word_vectors) {
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
        var tf_idf = vec[stem] * Math.log((nd + 1) / df[stem]);
        vec[stem] = tf_idf;
        total += tf_idf * tf_idf;
      }
      total = Math.sqrt(total);

      // Normalize the vectors
      for (var stem in word_vectors[key]) {
        vec[stem] /= total;
      }
    }
    return word_vectors;
  };

  // Reorder the arxivist divs based the preference scores
  var reorder_divs = function (scores) {
    var links = document.getElementsByTagName('a');
    var links_length = links.length;
    var blocks = document.getElementsByTagName('dl');
    var blocks_length = blocks.length
    for (var block_id = 0; block_id < blocks_length; ++block_id) {
      var block = blocks[block_id];
      var divs = block.getElementsByClassName('arxivist');
      var old_first_name = divs[0].querySelector("a[name]").getAttribute('name');
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

  // =============================
  // Handlers for the current page
  // =============================
  var page_word_vectors = {};
  var page_has_abstract = {};
  if (!is_abstract_page) {
    var res = compute_word_vectors();
    page_word_vectors = res[0];
    page_has_abstract = res[1];
    page_word_vectors = compute_tf_idf_vectors(page_word_vectors);

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

        // Find the parent arxivist block
        var url = element.href;
        element = element.parentElement;
        while (element && element.getAttribute('class') != 'arxivist') {
          element = element.parentElement;
        }

        // If it wasn't found, this was a different link. Proceed
        if (!element || element.getAttribute('class') != 'arxivist') {
          return true;
        }

        // Extract the arxiv ID from the id of the tag
        var arxiv_id = element.id;
        update_prefs(arxiv_id, page_word_vectors[arxiv_id], page_has_abstract[arxiv_id]);
      }

      return true;
    };
  }

  // ============================================
  // Request to load the current preferences etc.
  // ============================================
  store.get(['arxivist_prefs', 'arxivist_ids'], function(result) {
    console.log('current arxivist preferences are: ')
    console.log(result.arxivist_prefs);
    console.log('current arxivist ids are: ')
    console.log(result.arxivist_ids);

    if (result.arxivist_prefs) {
      arxivist_prefs = result.arxivist_prefs;
    } else {
      arxivist_prefs = {};
    }
    executed = true;

    if (result.arxivist_ids) {
      arxivist_ids = result.arxivist_ids;
    } else {
      arxivist_ids = [];
    }

    if (is_abstract_page) {
      // For an abstract page, update the preferences immediately
      var arxiv_id = "arXiv:" + page_url.split("/")[2];
      var word_vec = get_word_vector_for_block(document.getElementById("abs"))[0];
      word_vec = compute_tf_idf_vectors([word_vec])[0];
      update_prefs(arxiv_id, word_vec, true);
    } else {
      // Compute the distance between the user preferences and these papers
      var scores = get_scores_for_word_vectors(arxivist_prefs, page_word_vectors);

      // Re-order the arxivist divs based on the score
      reorder_divs(scores);
    }
  });

})();
