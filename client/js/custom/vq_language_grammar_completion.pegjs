

	  {
			// parse can have multiple arguments
			// parse(string, options) where options is an object
			// {schema: VQ_Schema, symbol_table:JSON, context:class_identification_object}
      options = arguments[1];
        			//console.log(options);
        			
      var continuations = {};
          
          function makeArray(value){
          	if (continuations[value]==null) {
          		continuations[value] = {};
          	}
          	return continuations;
          }
          
          function addContinuation(place, continuation, priority, type, start_end){
          	var position = "start";
          	if(start_end != null)position = start_end;
          	makeArray(place[position]["offset"]);
          	continuations[place[position]["offset"]][continuation]={name:continuation, priority:priority, type:type};
          }
          function returnContinuation(){
          	return JSON.stringify(continuations,null,2);
          }

		}
	
			LanguageGrammar = (Language ( comma Language)*)? end
			Language = Language_c (([A-Za-z] / "_" / "["/ "]") (([A-Za-z] / "_" / "["/ "]"))*)
			comma = comma_c ","

			Language_c = "" {
				addContinuation(location(), "[AUTO_LANGUAGE]", 90, 4);
				addContinuation(location(), "ab", 90, 4);
				addContinuation(location(), "aa", 90, 4);
				addContinuation(location(), "af", 90, 4);
				addContinuation(location(), "ak", 90, 4);
				addContinuation(location(), "sq", 90, 4);
				addContinuation(location(), "am", 90, 4);
				addContinuation(location(), "ar", 90, 4);
				addContinuation(location(), "an", 90, 4);
				addContinuation(location(), "hy", 90, 4);
				addContinuation(location(), "as", 90, 4);
				addContinuation(location(), "av", 90, 4);
				addContinuation(location(), "ae", 90, 4);
				addContinuation(location(), "ay", 90, 4);
				addContinuation(location(), "az", 90, 4);
				addContinuation(location(), "bm", 90, 4);
				addContinuation(location(), "ba", 90, 4);
				addContinuation(location(), "eu", 90, 4);
				addContinuation(location(), "be", 90, 4);
				addContinuation(location(), "bn", 90, 4);
				addContinuation(location(), "bi", 90, 4);
				addContinuation(location(), "bs", 90, 4);
				addContinuation(location(), "br", 90, 4);
				addContinuation(location(), "bg", 90, 4);
				addContinuation(location(), "my", 90, 4);
				addContinuation(location(), "ca", 90, 4);
				addContinuation(location(), "ch", 90, 4);
				addContinuation(location(), "ce", 90, 4);
				addContinuation(location(), "ny", 90, 4);
				addContinuation(location(), "zh", 90, 4);
				addContinuation(location(), "cv", 90, 4);
				addContinuation(location(), "kw", 90, 4);
				addContinuation(location(), "co", 90, 4);
				addContinuation(location(), "cr", 90, 4);
				addContinuation(location(), "hr", 90, 4);
				addContinuation(location(), "cs", 90, 4);
				addContinuation(location(), "da", 90, 4);
				addContinuation(location(), "dv", 90, 4);
				addContinuation(location(), "nl", 90, 4);
				addContinuation(location(), "dz", 90, 4);
				addContinuation(location(), "en", 90, 4);
				addContinuation(location(), "eo", 90, 4);
				addContinuation(location(), "et", 90, 4);
				addContinuation(location(), "ee", 90, 4);
				addContinuation(location(), "fo", 90, 4);
				addContinuation(location(), "fj", 90, 4);
				addContinuation(location(), "fi", 90, 4);
				addContinuation(location(), "fr", 90, 4);
				addContinuation(location(), "ff", 90, 4);
				addContinuation(location(), "gl", 90, 4);
				addContinuation(location(), "ka", 90, 4);
				addContinuation(location(), "de", 90, 4);
				addContinuation(location(), "el", 90, 4);
				addContinuation(location(), "gn", 90, 4);
				addContinuation(location(), "gu", 90, 4);
				addContinuation(location(), "ht", 90, 4);
				addContinuation(location(), "ha", 90, 4);
				addContinuation(location(), "he", 90, 4);
				addContinuation(location(), "hz", 90, 4);
				addContinuation(location(), "hi", 90, 4);
				addContinuation(location(), "ho", 90, 4);
				addContinuation(location(), "hu", 90, 4);
				addContinuation(location(), "ia", 90, 4);
				addContinuation(location(), "id", 90, 4);
				addContinuation(location(), "ie", 90, 4);
				addContinuation(location(), "ga", 90, 4);
				addContinuation(location(), "ig", 90, 4);
				addContinuation(location(), "ik", 90, 4);
				addContinuation(location(), "io", 90, 4);
				addContinuation(location(), "is", 90, 4);
				addContinuation(location(), "it", 90, 4);
				addContinuation(location(), "iu", 90, 4);
				addContinuation(location(), "ja", 90, 4);
				addContinuation(location(), "jv", 90, 4);
				addContinuation(location(), "kl", 90, 4);
				addContinuation(location(), "kn", 90, 4);
				addContinuation(location(), "kr", 90, 4);
				addContinuation(location(), "ks", 90, 4);
				addContinuation(location(), "kk", 90, 4);
				addContinuation(location(), "km", 90, 4);
				addContinuation(location(), "ki", 90, 4);
				addContinuation(location(), "rw", 90, 4);
				addContinuation(location(), "ky", 90, 4);
				addContinuation(location(), "kv", 90, 4);
				addContinuation(location(), "kg", 90, 4);
				addContinuation(location(), "ko", 90, 4);
				addContinuation(location(), "ku", 90, 4);
				addContinuation(location(), "kj", 90, 4);
				addContinuation(location(), "la", 90, 4);
				addContinuation(location(), "lb", 90, 4);
				addContinuation(location(), "lg", 90, 4);
				addContinuation(location(), "li", 90, 4);
				addContinuation(location(), "ln", 90, 4);
				addContinuation(location(), "lo", 90, 4);
				addContinuation(location(), "lt", 90, 4);
				addContinuation(location(), "lu", 90, 4);
				addContinuation(location(), "lv", 90, 4);
				addContinuation(location(), "gv", 90, 4);
				addContinuation(location(), "mk", 90, 4);
				addContinuation(location(), "mg", 90, 4);
				addContinuation(location(), "ms", 90, 4);
				addContinuation(location(), "ml", 90, 4);
				addContinuation(location(), "mt", 90, 4);
				addContinuation(location(), "mi", 90, 4);
				addContinuation(location(), "mr", 90, 4);
				addContinuation(location(), "mh", 90, 4);
				addContinuation(location(), "mn", 90, 4);
				addContinuation(location(), "na", 90, 4);
				addContinuation(location(), "nv", 90, 4);
				addContinuation(location(), "nd", 90, 4);
				addContinuation(location(), "ne", 90, 4);
				addContinuation(location(), "ng", 90, 4);
				addContinuation(location(), "nb", 90, 4);
				addContinuation(location(), "nn", 90, 4);
				addContinuation(location(), "no", 90, 4);
				addContinuation(location(), "ii", 90, 4);
				addContinuation(location(), "nr", 90, 4);
				addContinuation(location(), "oc", 90, 4);
				addContinuation(location(), "oj", 90, 4);
				addContinuation(location(), "cu", 90, 4);
				addContinuation(location(), "om", 90, 4);
				addContinuation(location(), "or", 90, 4);
				addContinuation(location(), "os", 90, 4);
				addContinuation(location(), "pa", 90, 4);
				addContinuation(location(), "pi", 90, 4);
				addContinuation(location(), "fa", 90, 4);
				addContinuation(location(), "pl", 90, 4);
				addContinuation(location(), "ps", 90, 4);
				addContinuation(location(), "pt", 90, 4);
				addContinuation(location(), "qu", 90, 4);
				addContinuation(location(), "rm", 90, 4);
				addContinuation(location(), "rn", 90, 4);
				addContinuation(location(), "ro", 90, 4);
				addContinuation(location(), "ru", 90, 4);
				addContinuation(location(), "sa", 90, 4);
				addContinuation(location(), "sc", 90, 4);
				addContinuation(location(), "sd", 90, 4);
				addContinuation(location(), "se", 90, 4);
				addContinuation(location(), "sm", 90, 4);
				addContinuation(location(), "sg", 90, 4);
				addContinuation(location(), "sr", 90, 4);
				addContinuation(location(), "gd", 90, 4);
				addContinuation(location(), "sn", 90, 4);
				addContinuation(location(), "si", 90, 4);
				addContinuation(location(), "sk", 90, 4);
				addContinuation(location(), "sl", 90, 4);
				addContinuation(location(), "so", 90, 4);
				addContinuation(location(), "st", 90, 4);
				addContinuation(location(), "es", 90, 4);
				addContinuation(location(), "su", 90, 4);
				addContinuation(location(), "sw", 90, 4);
				addContinuation(location(), "ss", 90, 4);
				addContinuation(location(), "sv", 90, 4);
				addContinuation(location(), "ta", 90, 4);
				addContinuation(location(), "te", 90, 4);
				addContinuation(location(), "tg", 90, 4);
				addContinuation(location(), "th", 90, 4);
				addContinuation(location(), "ti", 90, 4);
				addContinuation(location(), "bo", 90, 4);
				addContinuation(location(), "tk", 90, 4);
				addContinuation(location(), "tl", 90, 4);
				addContinuation(location(), "tn", 90, 4);
				addContinuation(location(), "to", 90, 4);
				addContinuation(location(), "tr", 90, 4);
				addContinuation(location(), "ts", 90, 4);
				addContinuation(location(), "tt", 90, 4);
				addContinuation(location(), "tw", 90, 4);
				addContinuation(location(), "ty", 90, 4);
				addContinuation(location(), "ug", 90, 4);
				addContinuation(location(), "uk", 90, 4);
				addContinuation(location(), "ur", 90, 4);
				addContinuation(location(), "uz", 90, 4);
				addContinuation(location(), "ve", 90, 4);
				addContinuation(location(), "vi", 90, 4);
				addContinuation(location(), "vo", 90, 4);
				addContinuation(location(), "wa", 90, 4);
				addContinuation(location(), "cy", 90, 4);
				addContinuation(location(), "wo", 90, 4);
				addContinuation(location(), "fy", 90, 4);
				addContinuation(location(), "xh", 90, 4);
				addContinuation(location(), "yi", 90, 4);
				addContinuation(location(), "yo", 90, 4);
				addContinuation(location(), "za", 90, 4);
				addContinuation(location(), "zu", 90, 4);
			}
			comma_c = "" {addContinuation(location(), ",", 50, 4);}
			end = "" {error(returnContinuation()); return;}
