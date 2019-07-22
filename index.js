const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { promisify } = require('util');
const __html = __dirname + '/public_html/';

const GoogleSpreadsheet = require('google-spreadsheet');
const credentials = require('./credentials.json');

const docId = '1kEijA8jkcCOa7FdDkkCnGAGJ_bs8ooKeTTsd5FGa_T0';

const doc = new GoogleSpreadsheet(docId);
/* doc.useServiceAccountAuth(credentials, err => {
	doc.getInfo( (err, info) => {
		console.log(info);
	});
}); */

const db = {
	read: async () => {
		await promisify(doc.useServiceAccountAuth)(credentials);
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
		/* console.log(nrows); */
		return nrows;
	},
	setstatus: async data => {
		await promisify(doc.useServiceAccountAuth)(credentials);
		const info = await promisify(doc.getInfo)();
		const worksheet = info.worksheets[0];
		let rows = await promisify(worksheet.getRows)({
			query: 'barcode = "NT00000004"'
		});
		rows = await rows.map( row => {
			row.status = data.status;
			row.save();
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
		/* console.log(rows); */
		return rows;
	}
};

app.get('/', function(req, res){
	res.sendFile(__html + '/index.html');
});

io.on('connection', function(socket){
	/* console.log('a user connected'); */

	socket.on('read', async function(){
		console.log('Reading db...');
		let data = await db.read();
		socket.emit('data', data);
	});

	socket.on('doing', async function(data){
		console.log('Setting status...');
		let status = await db.setstatus(data);
		socket.emit('data', status);
	});
});

http.listen(3000, function(){
	console.log('listening on *:3000');
});