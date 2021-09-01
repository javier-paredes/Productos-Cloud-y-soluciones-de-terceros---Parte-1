const express = require('express');
const productos = require('./api/productos');
const Mensajes = require('./api/mensajes')
const handlebars = require('express-handlebars')
const app = express();
const http = require('http');
const server = http.Server(app);
const io = require('socket.io')(server);
const Faker = require('./models/faker');
const normalize = require('normalizr').normalize;
const schema = require('normalizr').schema;
const session = require('express-session');
const cookieParser = require('cookie-parser')
const passport = require('passport');
// const bCrypt = require('bCrypt');
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('./models/users')
const dotenv = require('dotenv');
dotenv.config();
const cluster = require('cluster')
const { fork } = require('child_process');
const numCPUs = require('os').cpus().length
const compression = require('compression');
const log4js = require("log4js");

log4js.configure({
    appenders: {
        miLoggerConsole: { type: "console" },
        miLoggerError: { type: 'file', filename: 'error.log' },
        miLoggerWarn: { type: 'file', filename: 'warn.log' }
    },
    categories: {
        default: { appenders: ["miLoggerConsole"], level: "trace" },
        consola: { appenders: ["miLoggerConsole"], level: "info" },
        error: { appenders: ["miLoggerError"], level: "error" },
        warn: { appenders: ["miLoggerWarn"], level: "warn" }
    }
});
const loggerConsola = log4js.getLogger('consola');
const loggerWarn = log4js.getLogger('warn');
const loggerError = log4js.getLogger('error');



//CONECTAR CON MONGOOSE A LA DB DE MONGO
require('./database/connection');

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'secreto',
    resave: false,
    saveUninitialized: false
}));
// ---------------------------------------------------------------------------------------------

// PASSPORT

// setear facebook client id y secret key por linea de comando
let FACEBOOK_CLIENT_ID = " "
let FACEBOOK_CLIENT_SECRET = " ";

if (process.argv[4] && process.argv[5]) {
    FACEBOOK_CLIENT_ID = process.argv[4];
    FACEBOOK_CLIENT_SECRET = process.argv[5];
} else {
    loggerConsola.warn('No se ingresaron los valores correctamente. Se procede a usar valores por defecto')
    loggerWarn.warn('No se ingresaron los valores correctamente. Se procede a usar valores por defecto')

    FACEBOOK_CLIENT_ID = process.env.FACEBOOK_CLIENT_ID;
    FACEBOOK_CLIENT_SECRET = process.env.FACEBOOK_CLIENT_SECRET;
}

passport.use(new FacebookStrategy({
    clientID: FACEBOOK_CLIENT_ID,
    clientSecret: FACEBOOK_CLIENT_SECRET,
    callbackURL: '/auth/facebook/callback',
    profileFields: ['id', 'displayName', 'photos', 'emails'],
    scope: ['email']
}, function (accessToken, refreshToken, profile, done) {
    let userProfile = profile._json;
    loggerConsola.info(userProfile)

    return done(null, userProfile);
}));

passport.serializeUser(function (user, done) {

    done(null, user);
});

passport.deserializeUser(function (user, done) {

    done(null, user);
});


app.use(passport.initialize());
app.use(passport.session());

// -------------------------------------CLUSTER--------------------------------------------------------
const modoCluster = process.argv[3] == 'cluster'

if (modoCluster && cluster.isMaster) {
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork()
    }

    cluster.on('exit', worker => {
        console.log('Worker', worker.process.pid, 'murió', new Date().toLocaleString())
        cluster.fork()
    })
} else {
    app.get('/info', (req, res) => {
        let informacion = {}
        informacion['Argumentos de entrada:'] = `${process.argv[2]} ${process.argv[3]} ${process.argv[4]} ${process.argv[5]}`;
        informacion['Nombre de plataforma:'] = process.platform;
        informacion['Version de Node:'] = process.version;
        informacion['Uso de memoria:'] = process.memoryUsage();
        informacion['Path de ejecucion:'] = process.execPath;
        informacion['Process id:'] = process.pid;
        informacion['Carpeta corriente:'] = process.cwd();
        informacion['Numero de procesadores'] = numCPUs
        informacion['Puerto'] = process.argv[2]
        
        res.send(JSON.stringify(informacion, null, 4))
    })
}
// ---------------------------------------------------------------------------------------------


// ARCHIVOS ESTÁTICOS
(express.static('public'));

//CONFIGURAR HANDLEBARS
app.engine('hbs', handlebars({
    extname: '.hbs',
    defaultLayout: 'index.hbs',
    layoutsDir: __dirname + '/views/layouts'
}));

// ESTABLECER MOTOR DE PLANTILLAS
app.set("view engine", "hbs");
// DIRECTORIO ARCHIVOS PLANTILLAS
app.set("views", "./views");

// CREAR ROUTER
const routerProductos = express.Router();
const routerMensajes = express.Router();

// USAR ROUTERS
app.use('/api/productos', routerProductos);
app.use('/api/mensajes', routerMensajes);


// ---------------------------------------------------------------------------------------------

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html')
})

// LOGIN CON FACEBOOK

app.get('/auth/facebook', passport.authenticate('facebook'));

app.get('/auth/facebook/callback', passport.authenticate('facebook',
    {
        successRedirect: '/login',
        failureRedirect: '/faillogin'
    }
));

app.get('/login', (req, res) => {

    res.render('vista', {
        showLogin: false,
        showContent: true,
        bienvenida: req.user.name,
        email: req.user.email,
        urlImg: req.user.picture.data.url,
        showBienvenida: true
    });
})

app.get('/faillogin', (req, res) => {
    res.sendFile(__dirname + '/public/failLogin.html')
})

// LOGOUT
app.get('/logout', (req, res) => {
    req.logout();
    res.sendFile(__dirname + '/public/logout.html')
})


///////////////////// RUTA INFO /////////////////////
app.get('/info', (req, res) => {
    let informacion = {}
    informacion['Argumentos de entrada:'] = `${process.argv[2]} ${process.argv[3]} ${process.argv[4]} ${process.argv[5]}`;
    informacion['Nombre de plataforma:'] = process.platform;
    informacion['Version de Node:'] = process.version;
    informacion['Uso de memoria:'] = process.memoryUsage();
    informacion['Path de ejecucion:'] = process.execPath;
    informacion['Process id:'] = process.pid;
    informacion['Carpeta corriente:'] = process.cwd();
    informacion['Numero de procesadores'] = numCPUs
    informacion['Puerto'] = process.argv[2]

    res.send(JSON.stringify(informacion, null, 4))
})

//////////////////// NUMERO RANDOM ////////////////////

app.get('/random', (req, res) => {
    const numeroRandom = fork('./api/numeroRandom.js')
    let cantidad = 0
    if (req.query.cant & !isNaN(req.query.cant)) {
        cantidad = req.query.cant
    } else if (isNaN(req.query.cant)) {
        loggerError.error('No se ingresó un número en la ruta /random')
        res.send('Error:No se ingresó un número')
    }
    else {
        cantidad = 100000000
    }
    numeroRandom.send((cantidad).toString());
    numeroRandom.on("message", obj => {
        res.end(JSON.stringify(obj, null, 3));
    });
})


//////////////////// MENSAJES ///////////////////////

// LISTAR TODOS LOS MENSAJES
routerMensajes.get('/leer', async (req, res) => {
    try {
        let result = await Mensajes.devolver();
        return res.json(result);
    } catch (error) {
        loggerError.error(error)
        return res.status(500).send({ error: error.message });
    }
});

// LISTAR MENSAJES POR ID
routerMensajes.get('/leer/:id', async (req, res) => {
    try {
        let result = await Mensajes.buscarPorId(req.params.id);
        return res.json(result);
    } catch (error) {
        loggerError.error(error)
        return res.status(500).send({ error: error.message });
    }
});

// GUARDAR MENSAJES EN DB
routerMensajes.post('/guardar', async (req, res) => {
    try {
        let result = await Mensajes.guardar(req.body);
        return res.json(result);
    } catch (error) {
        loggerError.error(error)
        return res.status(500).send({ error: error.message });
    }
});

// ACTUALIZAR UN MENSAJE
routerMensajes.put('/actualizar/:id', async (req, res) => {
    try {
        let result = await Mensajes.actualizar(req.params.id, req.body);
        return res.json(result);
    } catch (error) {
        loggerError.error(error)
        return res.status(500).send({ error: error.message });
    }
});

// BORRAR UN MENSAJE
routerMensajes.delete('/borrar/:id', async (req, res) => {
    try {
        let result = await Mensajes.borrar(req.params.id);
        return res.json(result);
    } catch (error) {
        loggerError.error(error)
        return res.status(500).send({ error: error.message });
    }
});

// VISTA-TEST ** FAKER **
routerProductos.get('/vista-test/', (req, res) => {
    res.render('vista', { hayProductos: true, productos: Faker.generarProductos(10) })
})

routerProductos.get('/vista-test/:cant', (req, res) => {
    let cantidad = req.params.cant
    res.render('vista', { hayProductos: true, productos: Faker.generarProductos(cantidad) })
})

// LISTAR PRODUCTOS
routerProductos.get('/listar', async (req, res) => {
    try {
        let result = await productos.listar();
        return res.json(result);
    } catch (error) {
        loggerError.error(error)
        return res.status(500).send({ error: error.message });
    }
})

// LISTAR PRODUCTOS POR ID
routerProductos.get('/listar/:id', async (req, res) => {

    try {
        let mensajeLista = await productos.listarPorId(req.params.id);
        res.json(mensajeLista)
    } catch (error) {
        loggerError.error(error)
        return res.status(500).send({ error: error.message });
    }
})


// GUARDAR PRODUCTO
routerProductos.post('/guardar', async (req, res) => {
    try {
        let nuevoProducto = {};
        nuevoProducto.title = req.body.title;
        nuevoProducto.price = req.body.price;
        nuevoProducto.thumbnail = req.body.thumbnail;
        await productos.guardar(nuevoProducto)
        res.json(nuevoProducto)
    } catch (error) {
        loggerError.error(error)
        return res.status(500).send({ error: error.message });
    }
})

//ACTUALIZAR PRODUCTO POR ID
routerProductos.put('/actualizar/:id', async (req, res) => {
    try {
        let nuevoProducto = await productos.actualizar(req.params.id, req.body);
        res.json(nuevoProducto);
    } catch (error) {
        loggerError.error(error)
        return res.status(500).send({ error: error.message });
    }
})

// BORRAR PRODUCTO POR ID
routerProductos.delete('/borrar/:id', async (req, res) => {
    let productoBorrado = await productos.borrar(req.params.id);
    return res.json(productoBorrado);
})

// DATOS CHAT
const messages = [
    {
        autor: {
            email: "juan@gmail.com",
            nombre: "Juan",
            apellido: "Perez",
            edad: 25,
            alias: "Juano",
            avatar: "http://fotos.com/avatar.jpg"
        },
        texto: '¡Hola! ¿Que tal?'
    }
];

// SE EJECUTA AL REALIZAR LA PRIMERA CONEXION
io.on('connection', async socket => {
    loggerConsola.info('Usuario conectado')


    // GUARDAR PRODUCTO
    socket.on('nuevo-producto', nuevoProducto => {

        // console.log(nuevoProducto)
        productos.guardar(nuevoProducto)
    })
    // VERIFICAR QUE SE AGREGA UN PRODUCTO
    socket.emit('guardar-productos', () => {
        socket.on('notificacion', data => {
            console.log(data)
        })
    })
    // ACTUALIZAR TABLA
    socket.emit('actualizar-tabla', await productos.listar())

    // GUARDAR Y MANDAR MENSAJES QUE LLEGUEN DEL CLIENTE
    socket.on("new-message", async function (data) {


        await Mensajes.guardar(data)

        let mensajesDB = await Mensajes.getAll()

        const autorSchema = new schema.Entity('autor', {}, { idAttribute: 'nombre' });

        const mensajeSchema = new schema.Entity('texto', {
            autor: autorSchema
        }, { idAttribute: '_id' })

        const mensajesSchema = new schema.Entity('mensajes', {
            msjs: [mensajeSchema]
        }, { idAttribute: 'id' })

        const mensajesNormalizados = normalize(mensajesDB, mensajesSchema)

        messages.push(mensajesDB);

        loggerConsola.info(mensajesDB)

        loggerConsola.info(mensajesNormalizados)

        io.sockets.emit("messages", mensajesNormalizados);
    });
});

// pongo a escuchar el servidor en el puerto indicado
// definir puerto por linea de comandos
const PORT = process.env.PORT
// if (process.argv[2] && !isNaN(process.argv[2])) {
//     PORT = process.argv[2]
// } else if (isNaN(process.argv[2])) {
//     loggerWarn.warn('No se ingresó un puerto válido, se usará el 8080')
//     PORT = 8080
// }


// USO server PARA EL LISTEN
const svr = server.listen(PORT, () => {
    loggerConsola.info(process.argv)
    loggerConsola.info(`servidor escuchando en http://localhost:${PORT}`)
});


// en caso de error, avisar
server.on('error', error => {
    loggerError.error('error en el servidor:', error)
});
