var debug = false;

var Twit = require('twit');
var T = new Twit(require('./config.js'));
var pokemonSearch = {q: "#pokemon", count: 10, result_type: "recent"};
var pre;

var Pokedex = require('pokedex-promise-v2');
var P = new Pokedex();
var interval = {
    limit: 1000,
    offset: 0
}

var WordnikAPIKey = '77fb99e337193ec1160060616020ceb9bc29ec90c006aa76b';
var request = require('request');
var inflection = require('inflection');
var pluralize = inflection.pluralize;
var capitalize = inflection.capitalize;
var singularize = inflection.singularize;

// Blacklist
var wordfilter = require('wordfilter');

function nounUrl(minCorpusCount, limit) {
	return "http://api.wordnik.com/v4/words.json/randomWords?hasDictionaryDef=false&includePartOfSpeech=noun&minCorpusCount=" + minCorpusCount + "&maxCorpusCount=-1&minDictionaryCount=1&maxDictionaryCount=-1&minLength=5&maxLength=-1&limit=" + limit + "&api_key=" + WordnikAPIKey;
}

Array.prototype.pick = function() {
	return this[Math.floor(Math.random()*this.length)];
}
Array.prototype.remove = function() {
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};

//Retweets from #pokemon
function retweetLatest() {
	T.get('search/tweets', pokemonSearch, function (error, data) {
	  console.log(error, data);
	  if (!error) {
		var retweetId = data.statuses[0].id_str;
		T.post('statuses/retweet/' + retweetId, { }, function (error, response) {
			if (response) {
				console.log('Success! Check your bot, it should have retweeted something.')
			}
			if (error) {
				console.log('There was an error with Twitter:', error);
			}
		})
	  }
	  else {
	  	console.log('There was an error with your hashtag search:', error);
	  }
	});
}

//Retweets from official accounts that the bot is following
function retweetFollowing() {
	T.get('statuses/home_timeline', {count: 10}, function (error, data) {
	  console.log(data);
	  if (!error) {
	  	var tweet = data.pick();
		var retweetId = tweet.id_str;
		var userToRetweet = tweet.user.screen_name;
		console.log("Tweet", tweet);
		if (userToRetweet !== "poke_translator") {
			T.post('statuses/retweet/' + retweetId, { }, function (error, response) {
				if (response) {
					console.log('Success! Check your bot, it should have retweeted something.')
				}
				if (error) {
					console.log('There was an error with Twitter:', error);
				}
		    })
		}
	  }
	  else {
	  	console.log('There was an error with retweeting from a user you follow:', error);
	  }
	});
}

//Tweets from the preselected tweets
function tweet() {
	var tweetText = pre.pick();
	if (debug) 
		console.log('Debug mode: ', tweetText);
	else
		T.post('statuses/update', {status: tweetText }, function (err, reply) {
			if (err != null){
				console.log('Error: ', err);
			}
			else {
				console.log('Tweeted: ', tweetText);
			}
		});
}

//Quote retweets mentions with the translation
function translate() {
	T.get('statuses/mentions_timeline', {count: 1},  function (error, data) {
		console.log(data);
		if (error) {
		    console.log('Error: ', error);
		}
		else {
			var tweet = data[0];
			var str = data[0].text;
			str = str.replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ");
			var strArray = str.split(" ");
			console.log(strArray);
			var translation;
            var i;
            P.getPokemonByName(strArray[1].toLowerCase())
                .then(function(response) {
                	request("http://poetrydb.org/author", function(err, response, data) {
                		var authorData = JSON.parse(data);
				    	author = authorData.authors.pick();
				    	request("http://poetrydb.org/author/" + author, function(err, response, data) {
		    		    	var poetryData = JSON.parse(data);
		    		    	poem = poetryData.pick();
		    		    	poemLine = poem.lines[poem.lines.length - 1];
		    		    	console.log(poemLine);
		    		    	var retweetBody = "Translation: " + poemLine +
					        " https://twitter.com/" + tweet.user.screen_name + "/status/" + tweet.id_str;
            		    	T.post('statuses/update', {status: retweetBody}, function (err,response) {
                		    	if (response) {
                    		    	console.log('Quote Tweeted Tweet ID: ' + tweet.id_str);
                		    	}
                		    	if (err) {
                    	 	    	console.log('Quote Tweet Error: ', err);
                		    	}
            		    	});
	    		    	});
			    	});
            	})
            	.catch(function(error) {
                    console.log("Error!");
            	}
            );
		}
	});
}

function runBot() {
	request(nounUrl(5000, 200), function(err, response, data) {
		if (err != null) return;		// bail if no data
		nouns = eval(data);

		// Filter out the bad nouns via the wordfilter
		
		for (var i = 0; i < nouns.length; i++) {
			if (wordfilter.blacklisted(nouns[i].word))
			{
				console.log("Blacklisted: " + nouns[i].word);
				nouns.remove(nouns[i]);
				i--;
			}				
		}
		P.getPokemonsList(interval)
            .then(function(response) {
            var pokeName = response["results"].pick().name;
            pre = [
	    	    "Fun Fact! " + capitalize(pokeName) + " comes from the root word " + singularize(nouns.pick().word) + ".",
	    	    "The language " + capitalize(pokeName) + " has been used in " + capitalize(singularize(nouns.pick().word)) + " for many years.",
	    	    capitalize(pokeName) + ". Means " + singularize(nouns.pick().word) + ".",
	    	    "Did you know? " + capitalize(pokeName) + " is truly a beautiful language.",
        	    "Who's that Pokemon? It's " + capitalize(pokeName) + "!",
        	    "Author " + capitalize(singularize(nouns.pick().word)) + " is the leading specialist in the field of " + capitalize(pokeName) + " linguistics. Read their new work!",
        	    "It's said that learning the " + capitalize(pokeName) + " language has many " + pluralize(nouns.pick().word) + ".",
        	    "The " + capitalize(pokeName) + " languages have an illustrious " + singularize(nouns.pick().word) + "."
	         ];
		    var rand = Math.random();

 		    if(rand > 0.5) {      
			    console.log("-------Tweet something");
			    tweet();
		    } else if (rand < 0.25) {
			    console.log("-------Retweet something");
			    retweetLatest();
		    } else {
		    	console.log("-------Retweet from following");
		    	retweetFollowing();
		    }
        })
	});
    translate();
}

runBot();
setInterval(runBot, 1000 * 60 * 60);
