import mongoose from 'mongoose'

const blogSchema = new mongoose.Schema({
    docId: {
        type: String,
    },
    author: {
        type: String
    },
    title: {
        type: String
    },
    date: {
        type: String
    },
    summary: {
        type: String
    },
    content: {
        type: String
    },
    coverImg: {
        type: String
    }
})

const blogModel = mongoose.model.blog || mongoose.model('blog', blogSchema)

export default blogModel