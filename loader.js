var http = require('http');
var fs = require('fs');
var needle = require('needle');
var cheerio = require("cheerio");

var options = {
  compressed : true, // sets 'Accept-Encoding' to 'gzip,deflate' 
  follow : true,
  follow_max : 5, // follow up to five redirects
  multipart: true, 
  rejectUnauthorized : true // verify SSL certificate 
}
	
function search (array, index, save) {
	if (array[index] === 'undefined') {
		return;
	}	

	var url = 'http://relefopt.ru/search?q=' + array[index].code;

	needle.get(url, options, function(error, response){
		if (!error) {
			console.log('');
			console.log('[' + array[index].id + '] ' + array[index].name);

			var $=cheerio.load(response.body);
			
			var img_src = $('#content > div:nth-child(2) > div.shadow-box.item-holder > div.center.rc-item.rc-template_mark_list > div > div > div.item-block > div.item-gallery > div.visual > div > img').attr("src");
			
			if (typeof img_src === 'undefined') {				
				console.log("Not search: " + array[index].code + ". Status code: "+response.statusCode);
				search(array, index+1, save);
			} else {
				var path = "download/" + array[index].id + img_src.substring(img_src.lastIndexOf('.'), img_src.length);
				var img_url = "http://relefopt.ru"+img_src;		
			
				fs.exists(path, function (exists) {
					if (!exists) {
						var file = fs.createWriteStream(path);
						var request = http.get(img_url, function (res) {
							res.pipe(file);
							file.on('finish', function() {
								file.close();
								console.log(array[index].code + ' -> load image is Ok');								
								save(array[index].id, path);
								search(array, index+1, save);
							});							
						});						
					} else {
						console.log("Exist file: " + path);
						search(array, index+1, save);
					}		
				});
			}
		} else {
			console.log("Error get page: " + error);
			search(array, index+1, save);
		}
	});
}

exports.search = search;