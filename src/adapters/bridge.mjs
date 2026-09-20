export class ScopedBridge {
  constructor({url,token,fetchImpl=globalThis.fetch,timeoutMs=25000}) {
    const endpoint=new URL(url);
    if(endpoint.protocol!=='http:'||endpoint.hostname!=='127.0.0.1'||endpoint.pathname!=='/'||endpoint.username||endpoint.password||endpoint.search||endpoint.hash||!token)throw new Error('Only an authenticated IPv4 loopback bridge is supported');
    if(!Number.isFinite(timeoutMs)||timeoutMs<=0||timeoutMs>60000)throw new Error('Invalid bridge timeout');
    this.url=endpoint.origin;this.token=token;this.fetch=fetchImpl;this.timeoutMs=timeoutMs;
  }
  async request(path,body) {
    const response=await this.fetch(this.url+path,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${this.token}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(this.timeoutMs)});
    const data=await response.json();if(!response.ok||data.error)throw new Error(data.error??'Scoped bridge request failed');return data;
  }
  observe(){return this.request('/snapshot');}
  execute(action,snapshot){return this.request('/act',{revision:snapshot.revision,actionId:action.id});}
}
export class CalculatorBridge extends ScopedBridge {}
