const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { promisify } = require('util');
const __html = __dirname + '/public_html/';

const GoogleSpreadsheet = require('google-spreadsheet');
const credentials = require('./credentials.json');

const docId = '1kEijA8jkcCOa7FdDkkCnGAGJ_bs8ooKeTTsd5FGa_T0';
const doc = new GoogleSpreadsheet(docId);

const db = {
	get: async () => {
		const info = await promisify(doc.getInfo)();
		const worksheet = info.worksheets[0];
		const rows = await promisify(worksheet.getRows)({});
		const nrows = await rows.map( row => {
			return {
				name: row.name,
				service: row.service,
				description: row.description,
				status: row.status,
				price: row.price,
				barcode: row.barcode,
				addedat: row.addedat,
				finishat: row.finishat
			};
		});
		return nrows;
	},
	update: async data => {
		const info = await promisify(doc.getInfo)();
		const worksheet = info.worksheets[0];
		let rows = await promisify(worksheet.getRows)({
			query: 'barcode = "NT00000004"'
		});
		rows[0].status = data.status;
		rows[0].save();
		return 'updated';
	},
	add: async data => {
		const info = await promisify(doc.getInfo)();
		const worksheet = info.worksheets[0];
		/*
			_links: [Array],
			resize: [Function: _setInfo],
			setTitle: [Function],
			clear: [Function],
			getRows: [Function],
			getCells: [Function],
			addRow: [Function],
			bulkUpdateCells: [Function],
			del: [Function],
			setHeaderRow: [Function]
		*/
		await promisify(worksheet.addRow)(data);
		return 'added';
	},
	remove: async data => {
		const info = await promisify(doc.getInfo)();
		const worksheet = info.worksheets[0];
		let rows = await promisify(worksheet.getRows)({
			query: 'barcode = "'+data.barcode+'"'
		});
		rows[0].del();
		return 'removed';
	},
	connect: async function(){
		await promisify(doc.useServiceAccountAuth)(credentials);
		/*
			resize: [Function: _setInfo],
			setTitle: [Function],
			clear: [Function],
			getRows: [Function],
			getCells: [Function],
			addRow: [Function],
			bulkUpdateCells: [Function],
			del: [Function],
			setHeaderRow: [Function]
		*/
		console.log('connected to db');
	}
};

db.connect();

app.get('/', function(req, res){
	res.sendFile(__html + '/index.html');
});

io.on('connection', function(socket){
	/* console.log('a user connected'); */

	socket.on('get', async function(){
		console.log('Reading db...');
		let data = await db.get();
		socket.emit('data', data);
	});

	socket.on('add', async function(data){
		console.log('Adding row...');
		let status = await db.add(data);
		socket.emit('data', status);
	});

	socket.on('update', async function(data){
		console.log('Setting status...');
		let status = await db.update(data);
		socket.emit('data', status);
	});

	socket.on('remove', async function(data){
		console.log('Removing row...');
		let status = await db.remove(data);
		socket.emit('data', status);
	});
});

http.listen(3000, function(){
	console.log('listening on *:3000');
});