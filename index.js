var express = require("express")
var app = express()
const {readdir, readFile} = require('fs').promises

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

const DIR = process.env.BASTION_DIR || '/opt/connections/'
const ROOT_URL = process.env.BASTION_ROOT_URL || 'https://bastion.gracey.dev'

const getHosts = async ()=>{
  const files = await readdir(DIR)
  
  const hosts = await Promise.all( files.map( (file) => (
    readFile(DIR+file, 'utf8').then((contents)=>(contents+','+file))
  )))

  return hosts.map((hostline)=>{
    const [hostname, store, ip, file] = hostline.split(',')
    return {
      hostname, store, ip, url: `${ROOT_URL}/proxy/${file}/`
    }
  })
}


app.get('/',function(req, res) {
  getHosts().then((ret)=>{
    res.send(ret)
  })
})

app.all('/proxy/:host/*', (req,res)=>{
  const httpTarget = 'http://localhost:' + req.params.host 
  apiProxy.web(req, res, {target:httpTarget, ws: true})
})

const server = app.listen(3000)

server.on('upgrade', function (req, socket, head) {
  const httpTarget = 'ws://localhost:' + req.url.split('/')[2]
  apiProxy.ws(req, socket, head, {target:httpTarget, ws: true});
})
