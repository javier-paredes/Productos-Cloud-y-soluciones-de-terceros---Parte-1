const normalize = require('normalizr').normalize
const schema = require('normalizr').schema

const gerenteSchema = new schema.Entity('gerente');

const encargadoSchema = new schema.Entity('encargado');

const empleadoSchema = new schema.Entity('empleados');

const postSchema = new schema.Entity('empresa', {
    gerente: gerenteSchema,
    encargado: encargadoSchema,
    empleados: [empleadoSchema]
})

const empresaNormalizada = normalize(empresa, postSchema)