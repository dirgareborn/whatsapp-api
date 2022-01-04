const { Client, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const {body, validationResult } = require('express-validator');

const socketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');
const fs = require('fs');
const { phoneNumberFormatter} = require('./helpers/formatter');
const fileUpload = require('express-fileupload');
const port = process.env.PORT || 8000 ;

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
    debug:true
}));

const SESSION_FILE_PATH = './whatsapp-session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}

app.get('/', (req, res)=>{
    res.sendFile('index.html', {root:__dirname})
});
const client = new Client({ 
    puppeteer: { 
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // <- this one doesn't works in Windows
            '--disable-gpu'
          ], 
    }, 
        session: sessionCfg });

client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
});

client.on('authenticated', (session) => {
    console.log('AUTHENTICATED', session);
    sessionCfg=session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
        if (err) {
            console.error(err);
        }
    });
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('message', msg => {
    if (msg.body == '!ping') {
        msg.reply('pong');
    }else if(msg.body == 'Selamat Pagi'){
        msg.reply('Selamat Pagi Juga');
    }
});
// Socket IO
io.on('connection', function(socket){
    socket.emit('message', 'Connecting...');

    client.on('qr', (qr) => {
        console.log('QR RECEIVED', qr);
        qrcode.toDataURL(qr, (err, url)=>{
            socket.emit('qr', url);  
            socket.emit('message', 'QR Code Scan Me'); 
        });
    });
    client.on('ready', () => {
        socket.emit('ready', 'Whatsapp is ready'); 
        socket.emit('message', 'Whatsapp is ready'); 
    });

    client.on('authenticated', (session) => {
        socket.emit('authenticated', 'Whatsapp is authenticated!'); 
        socket.emit('message', 'Whatsapp is authenticated!');
        console.log('AUTHENTICATED', session);
        sessionCfg=session;
        fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
            if (err) {
                console.error(err);
            }
        });
    });

});

const checkRegisteredNumber = async function(number){
    const isRegistered = client.isRegisteredUser(number);
    return isRegistered;
}
// send media
app.post('/send-media',(req, res)=>{
    const number = phoneNumberFormatter(req.body.number);
    const caption = req.body.caption;
    const media = MessageMedia.fromFilePath('./image-example.png');
    const file = req.files.file;
    console.log(file);
    return;
    
    client.sendMessage(number, media, { caption: caption }).then(response =>{
        res.status(200).json({
            status :true,
            response: response
        });
    }).catch(err => {
        res.status(500).json({
            status :false,
            response: err
    });
    });
});

// send message 
app.post('/send-message',[
    body('number').notEmpty(),
    body('message').notEmpty(),
],async (req, res)=>{
    const errors = validationResult(req).formatWith( ({ msg }) => {
        return msg;
    });
    if (!errors.isEmpty()){
        return res.status(422).json({
            status: false,
            message: errors.mapped()
        });
    }
    const number = phoneNumberFormatter(req.body.number);
    const message = req.body.message;

    const isRegisteredNumber = await  checkRegisteredNumber(number);

    if (!isRegisteredNumber){
        return res.status(422).json({
            status:false,
            message: 'The number is not registered'
        });
    }
    client.sendMessage(number, message).then(response =>{
        res.status(200).json({
            status :true,
            response: response
        });
    }).catch(err => {
        res.status(500).json({
            status :false,
            response: err
    });
    });
});

client.initialize();
server.listen(port,function(){
    console.log('App running on *:' + port);
});