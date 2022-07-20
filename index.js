var express = require("express")
var app = express()
const http = require('http')
const {readdir, readFile} = require('fs').promises

const { ungzip } = require('node-gzip')
var httpProxy = require('http-proxy')

var apiProxy = httpProxy.createProxyServer({
  preserveHeaderKeyCase: true,
  secure: false, 
  hostRewrite:true,
  autoRewrite:true,
  followRedirects:true,
  proxyTimeout: 10000,
  changeOrigin: true,
  xfwd: true
})

apiProxy.on('error',(err)=>{console.error(err)})

apiProxy.on('proxyReqWs', ()=>{
  console.log('proxyReqWs')
})

apiProxy.on('proxyReq', ()=>{
  console.log('proxyReq')
})

const DIR = process.env.BASTION_DIR || '/opt/connections/'

const getHosts = async ()=>{
  const files = await readdir(DIR)
  
  const hosts = await Promise.all( files.map( (file) => (
    readFile(DIR+file, 'utf8').then((contents)=>(contents+','+file))
  )))

  return hosts.map((hostline)=>{
    const [hostname, store, ip, file] = hostline.split(',')
    return {
      hostname,store, ip, url: `https://bastion.gracey.dev/proxy/${file}/`
    }
  })
}


// const serve = http.createServer((req, res)=>{
//   console.log(req.path)
//   if (req.path == '/') {
//     getHosts().then((hosts)=>{
//       res.send(hosts)
//     })
//   }

// }).listen(3000)


app.get('/',function(req, res) {
  getHosts().then((ret)=>{
    res.send(ret)
  })
})


app.all('/proxy/:host/*', (req,res)=>{
  console.log(req.protocol, req.path)
  const httpTarget = 'http://localhost:' + req.params.host 
  apiProxy.web(req, res, {target:httpTarget, ws: true})

})

const server = app.listen(3000)


server.on('upgrade', function (req, socket, head) {
  console.log('UPGRADE REQUEST!!!!')
  const httpTarget = 'ws://localhost:' + req.url.split('/')[2]
  console.log(httpTarget)
  apiProxy.ws(req, socket, head, {target:httpTarget, ws: true});
})

// serve.on('upgrade', function (req, socket, head) {
//   console.log('UPGRADE REQUEST!!!!')
//   apiProxy.ws(req, socket, head);
// })