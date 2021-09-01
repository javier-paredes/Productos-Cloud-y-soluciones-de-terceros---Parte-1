const Mensaje = require('../models/mensajes')
const normalize = require('normalizr').normalize

class Mensajes {

    constructor() {

    }

    async devolver() {
        try {
            return Mensaje.find({});
        } catch (error) {
            throw error;
        }
    }

    async getAll() {
        try {
            let mensajes = await this.devolver()
            // console.log('!!!!!MENSAJES DESE LA DB!!!!!' + mensajes)
            // //print(mensajes)
            let mensajesConId = { 
                id: 'mensajes', 
                mensajes : mensajes.map( mensaje => ({...mensaje._doc}))
            }                      
        
            return mensajesConId;
        }
        catch {
            return []
        }
    }

    async buscarPorId(id) {
        try {
            return Mensaje.findById({ _id: id })
        } catch (error) {
            throw error;
        }
    }

    async guardar(mensaje) {
        try {
            return Mensaje.create(mensaje)
        } catch (error) {
            throw error;
        }
    }

    async actualizar(id, mensaje) {
        try {
            return Mensaje.findByIdAndUpdate(id, mensaje)
        } catch (error) {
            throw error;
        }
    }

    async borrar(id) {
        try {
            return Mensaje.findByIdAndDelete(id);
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new Mensajes();