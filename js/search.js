const suggestions = document.getElementById('suggestions');
const userinput = document.getElementById('userinput');

document.addEventListener('keydown', inputFocus);

function inputFocus(e) {

  if (e.keyCode === 191
      && document.activeElement.tagName !== "INPUT"
      && document.activeElement.tagName !== "TEXTAREA") {
    e.preventDefault();
    userinput.focus();
  }

  if (e.keyCode === 27 ) {
    userinput.blur();
    suggestions.classList.add('d-none');
  }

}

document.addEventListener('click', function(event) {

  const isClickInsideElement = suggestions.contains(event.target);

  if (!isClickInsideElement) {
    suggestions.classList.add('d-none');
  }

});

/*
Source:
  - https://dev.to/shubhamprakash/trap-focus-using-javascript-6a3
*/

document.addEventListener('keydown',suggestionFocus);

function suggestionFocus(e){
  const focusableSuggestions= suggestions.querySelectorAll('a');
  if (suggestions.classList.contains('d-none')
      || focusableSuggestions.length === 0) {
    return;
  }
  const focusable= [...focusableSuggestions];
  const index = focusable.indexOf(document.activeElement);

  let nextIndex = 0;

  if (e.keyCode === 38) {
    e.preventDefault();
    nextIndex= index > 0 ? index-1 : 0;
    focusableSuggestions[nextIndex].focus();
  }
  else if (e.keyCode === 40) {
    e.preventDefault();
    nextIndex= index+1 < focusable.length ? index+1 : index;
    focusableSuggestions[nextIndex].focus();
  }

}

/*
Source:
  - https://github.com/nextapps-de/flexsearch#index-documents-field-search
  - https://raw.githack.com/nextapps-de/flexsearch/master/demo/autocomplete.html
  - http://elasticlunr.com/
  - https://github.com/getzola/zola/blob/master/docs/static/search.js
*/
(function(){
  let index = elasticlunr.Index.load(window.searchIndex);
  userinput.addEventListener('input', show_results, true);
  suggestions.addEventListener('click', accept_suggestion, true);
  
  function show_results(){
    const value = this.value.trim();
    
    if (value.length === 0) {
      suggestions.classList.add('d-none');
      return;
    }
    
    // 한글과 영어를 모두 지원하는 검색 로직
    const searchTerms = value.split(/\s+/).filter(term => term.length > 0);
    
    // elasticlunr 검색과 직접 검색을 병행
    const options = {
      bool: "OR",
      fields: {
        title: {boost: 3, expand: true},
        body: {boost: 1, expand: true}
      },
      expand: true
    };
    
    let results = [];
    
    try {
      // elasticlunr 검색 (영어에 효과적)
      results = index.search(value, options);
    } catch (e) {
      console.log("elasticlunr search failed, falling back to manual search");
      results = [];
    }
    
    // 한글 검색을 위한 추가 검색 로직
    const allDocs = window.searchIndex.documentStore.docs;
    const manualResults = [];
    
    Object.keys(allDocs).forEach(docId => {
      const doc = allDocs[docId];
      let score = 0;
      let titleMatches = 0;
      let bodyMatches = 0;
      
      searchTerms.forEach(term => {
        const lowerTerm = term.toLowerCase();
        
        // 제목에서 검색
        if (doc.title && doc.title.toLowerCase().includes(lowerTerm)) {
          titleMatches++;
          score += 3; // 제목 매칭은 높은 점수
        }
        
        // 본문에서 검색
        if (doc.body && doc.body.toLowerCase().includes(lowerTerm)) {
          bodyMatches++;
          score += 1;
        }
      });
      
      // 모든 검색어가 포함된 경우만 결과에 추가
      if (titleMatches + bodyMatches >= searchTerms.length) {
        manualResults.push({
          ref: doc.id,
          score: score,
          doc: doc
        });
      }
    });
    
    // elasticlunr 결과와 수동 검색 결과 병합
    const allResults = new Map();
    
    // elasticlunr 결과 추가
    results.forEach(result => {
      allResults.set(result.ref, result);
    });
    
    // 수동 검색 결과 추가 (중복 제거하면서 점수 합산)
    manualResults.forEach(result => {
      if (allResults.has(result.ref)) {
        allResults.get(result.ref).score += result.score;
      } else {
        allResults.set(result.ref, result);
      }
    });
    
    // 점수순으로 정렬
    const finalResults = Array.from(allResults.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // 상위 10개만 표시

    // 기존 결과 제거
    while(suggestions.firstChild) {
      suggestions.removeChild(suggestions.firstChild);
    }
    
    suggestions.classList.remove('d-none');

    finalResults.forEach(function(page) {
      if (page.doc.body !== '') {
        const entry = document.createElement('div');
        entry.innerHTML = '<a href><span></span><span></span></a>';
  
        const a = entry.querySelector('a');
        const t = entry.querySelector('span:first-child');
        const d = entry.querySelector('span:nth-child(2)');
        
        a.href = page.ref;
        t.textContent = page.doc.title;
        d.innerHTML = makeTeaser(page.doc.body, searchTerms);
  
        suggestions.appendChild(entry);
      }
    });

  }

  function accept_suggestion(){

      while(suggestions.lastChild){

          suggestions.removeChild(suggestions.lastChild);
      }

      return false;
  }

  // 한글 지원 개선된 makeTeaser 함수
  function makeTeaser(body, terms) {
    let TEASER_MAX_WORDS;
    const TERM_WEIGHT = 40;
    const NORMAL_WORD_WEIGHT = 2;
    const FIRST_WORD_WEIGHT = 8;
    //if mobile
    if (window.innerWidth < 768) {
      TEASER_MAX_WORDS = 15;
    }else{
      TEASER_MAX_WORDS = 60;
    }

    // 한글의 경우 stemming 대신 직접 문자열 매칭 사용
    const lowerTerms = terms.map(function (w) {
      return w.toLowerCase();
    });
    
    let termFound = false;
    let index = 0;
    const weighted = []; // contains elements of ["word", weight, index_in_document]
  
    // split in sentences, then words
    const sentences = body.toLowerCase().split(". ");
    for (var i in sentences) {
      const words = sentences[i].split(/[\s\n]/);
      let value = FIRST_WORD_WEIGHT;
      for (let j in words) {
        
        var word = words[j];
  
        if (word.length > 0) {
          for (let k in lowerTerms) {
            // 한글 검색을 위해 contains 방식 사용 (stemming 대신)
            if (word.includes(lowerTerms[k]) || lowerTerms[k].includes(word)) {
              value = TERM_WEIGHT;
              termFound = true;
            }
          }
          weighted.push([word, value, index]);
          value = NORMAL_WORD_WEIGHT;
        }
  
        index += word.length;
        index += 1;  // ' ' or '.' if last word in sentence
      }
  
      index += 1;  // because we split at a two-char boundary '. '
    }
  
    if (weighted.length === 0) {
      if (body.length !== undefined && body.length > TEASER_MAX_WORDS * 10) {
        return body.substring(0, TEASER_MAX_WORDS * 10) + '...';
      } else {
        return body;
      }
    }

    const windowWeights = [];
    const windowSize = Math.min(weighted.length, TEASER_MAX_WORDS);
    // We add a window with all the weights first
    let curSum = 0;
    for (var i = 0; i < windowSize; i++) {
      curSum += weighted[i][1];
    }
    windowWeights.push(curSum);
  
    for (var i = 0; i < weighted.length - windowSize; i++) {
      curSum -= weighted[i][1];
      curSum += weighted[i + windowSize][1];
      windowWeights.push(curSum);
    }
  
    // If we didn't find the term, just pick the first window
    let maxSumIndex = 0;
    if (termFound) {
      let maxFound = 0;
      // backwards
      for (var i = windowWeights.length - 1; i >= 0; i--) {
        if (windowWeights[i] > maxFound) {
          maxFound = windowWeights[i];
          maxSumIndex = i;
        }
      }
    }

    const teaser = [];
    let startIndex = weighted[maxSumIndex][2];
    for (var i = maxSumIndex; i < maxSumIndex + windowSize; i++) {
      var word = weighted[i];
      if (startIndex < word[2]) {
        // missing text from index to start of `word`
        teaser.push(body.substring(startIndex, word[2]));
        startIndex = word[2];
      }
  
      // add <em/> around search terms - 한글 지원 개선
      let isHighlight = false;
      for (let k in lowerTerms) {
        if (word[0].toLowerCase().includes(lowerTerms[k]) || lowerTerms[k].includes(word[0].toLowerCase())) {
          isHighlight = true;
          break;
        }
      }
      
      if (isHighlight) {
        teaser.push("<b>");
      }

      startIndex = word[2] + word[0].length;
      // Check the string is ascii characters or not
      const re = /^[\x00-\xff]+$/;
      if (!isHighlight && word[0].length >= 12 && !re.test(word[0])) {
        // If the string's length is too long, it maybe a Chinese/Japance/Korean article
        // if using substring method directly, it may occur error codes on emoji chars
        const strBefor = body.substring(word[2], startIndex);
        const strAfter = substringByByte(strBefor, 12);
        teaser.push(strAfter);
      } else {
        teaser.push(body.substring(word[2], startIndex));
      }
  
      if (isHighlight) {
        teaser.push("</b>");
      }
    }
    teaser.push("…");
    return teaser.join("");
  }
}());


// Get substring by bytes
// If using JavaScript inline substring method, it will return error codes 
// Source: https://www.52pojie.cn/thread-1059814-1-1.html
function substringByByte(str, maxLength) {
  let result = "";
  let flag = false;
  let len = 0;
  let length = 0;
  let length2 = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.codePointAt(i).toString(16);
    if (code.length > 4) {
      i++;
      if ((i + 1) < str.length) {
        flag = str.codePointAt(i + 1).toString(16) == "200d";
      }
    }
    if (flag) {
      len += getByteByHex(code);
      if (i == str.length - 1) {
        length += len;
        if (length <= maxLength) {
          result += str.substr(length2, i - length2 + 1);
        } else {
          break
        }
      }
    } else {
      if (len != 0) {
        length += len;
        length += getByteByHex(code);
        if (length <= maxLength) {
          result += str.substr(length2, i - length2 + 1);
          length2 = i + 1;
        } else {
          break
        }
        len = 0;
        continue;
      }
      length += getByteByHex(code);
      if (length <= maxLength) {
        if (code.length <= 4) {
          result += str[i]
        } else {
          result += str[i - 1] + str[i]
        }
        length2 = i + 1;
      } else {
        break
      }
    }
  }
  return result;
}

// Get the string bytes from binary
function getByteByBinary(binaryCode) {
  // Binary system, starts with `0b` in ES6
  // Octal number system, starts with `0` in ES5 and starts with `0o` in ES6
  // Hexadecimal, starts with `0x` in both ES5 and ES6
  const byteLengthDatas = [0, 1, 2, 3, 4];
  const len = byteLengthDatas[Math.ceil(binaryCode.length / 8)];
  return len;
}

// Get the string bytes from hexadecimal
function getByteByHex(hexCode) {
  return getByteByBinary(parseInt(hexCode, 16).toString(2));
}
