var Firebird = require('firebirdsql');
var fs = require('fs');
var loader = require('./loader.js');

function start(configfile) {
	var options = {
		host: '127.0.0.1',
		port: 3050,
		database: 'base',
		user: 'SYSDBA',
		password: 'masterkey'
	};

	fs.readFile(configfile, 'utf8', function(err, contents) {	

		if (err)
			throw err;

		options.database = contents;

		parsing(options);
	});
}

function parsing(options) {
	// подключаемся к базе и выполняем селективный запрос
	Firebird.attach(options, function(err, db) {

		if (err)
			throw err;

		db.query('SELECT * FROM goods WHERE owner=60761 ORDER BY id ASC', function(err, result) {
			var array = new Array();
			for (var i = 0; i < result.length; i++) {
				var code1 = '';
				var code2 = '';
				// парсим описание - НАЗВАНИЕ (КОД) (АРТИКУЛ)
				if (/ \([0-9]+\)/g.test(result[i].description)) {
					code1 = / \([0-9]+\)/g.exec(result[i].description)[0];
					code1 = code1.trim();
					code1 = code1.substring(1, code1.length-1);
					array.length++;
					array[array.length-1] = {
						id : result[i].id,
						name : result[i].description,
						code : code1
					}
				}
				// парсим описание - НАЗВАНИЕ (АРТИКУЛ) (КОД)
				if (/ \([0-9]+\)$/g.test(result[i].description)) {
					code2 = / \([0-9]+\)$/g.exec(result[i].description)[0];
					code2 = code2.trim();
					code2 = code2.substring(1, code2.length-1);
					if (code1 != code2) {
						array.length++;
						array[array.length-1] = {
							id : result[i].id,
							name : result[i].description,
							code : code2
						}
					}
				}
			}
			// закрываем соединение
			db.detach;
			// вызываем загрузчик
			loader.search(array, 0, function (id, path) {
				save(options, id, path);
			});
		});
	});
}

function save(options, good, path) {
	var file = fs.createReadStream(path);
	// подключаемся к базе и загружаем картинку
	Firebird.attach(options, function(err, db) {
 
		if (!err) {			
			db.transaction(Firebird.ISOLATION_READ_COMMITED, function(err, transaction) {								
				transaction.query('UPDATE goods SET img=? WHERE id=?', [file, good], function(err, result) {		
					if (err) {
						console.log("Error update: " + err);
						transaction.rollback();
						db.detach();
					} else {						
						transaction.commit(function(err) {
							if (err) 
								transaction.rollback();
							else {
								console.log(path + ' -> save image is Ok');
							}
											
							db.detach();
						});
					}
				});
			});
		} else {
			console.log("Error attach for update: " + err);
		}
	});
}

exports.start = start;