import {CalculatorBridge,JevRouter,runTask,createSkyExecutor,calibrationFrom} from '../src/index.mjs';
/** Host loads configuration privately, observes the official screenshot first,
 * then supplies the returned window and screenshot. Nothing starts on import.
 */
export async function calculatorTask({bridgeConfig,apiKey,sky,window,screenshot,backend='sky',expression='8*9',planner,onEvent=()=>{}}) {
  if(!/^[1-9][*+][1-9]$/.test(expression))throw new Error('Use two digits with * or +');
  if(!['sky','trycua'].includes(backend))throw new Error('Unknown executor');
  const [a,op,b]=expression, number=op==='*'?Number(a)*Number(b):Number(a)+Number(b), sign=op==='*'?'×':'+';
  const goal=`Calculate ${a} ${op==='*'?'multiplied by':'plus'} ${b}, ending with equals. The expression should be ${a} ${sign} ${b}= and display ${number}.`;
  const bridge=new CalculatorBridge(bridgeConfig), first=await bridge.observe();
  const verify=s=>s.facts?.expression===`${a} ${sign} ${b}=`&&s.facts?.display===String(number);
  if(verify(first))throw new Error('Result already displayed; choose another expression for a meaningful test');
  const executor=backend==='sky'?createSkyExecutor({sky,window,calibration:calibrationFrom(first,screenshot)}):bridge;
  return runTask({goal,observer:bridge,executor,router:new JevRouter({apiKey}),verify,planner,onEvent});
}
