// Parse only whitelisted data expressions. Never execute the supplied page script.
const ts=require('../apps/mobile/node_modules/typescript');
const input=require('node:fs').readFileSync(0,'utf8');
const file=ts.createSourceFile('source-map.js',input,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const env=Object.create(null),wanted=new Set(['RK','R','P','PB','M']);
const safeKey=k=>{if(['__proto__','prototype','constructor'].includes(String(k)))throw Error('Unsafe property');return k};
function data(n,scope=env){
 if(ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n))return n.text;
 if(ts.isNumericLiteral(n))return Number(n.text);
 if(ts.isIdentifier(n)){if(Object.hasOwn(scope,n.text))return scope[n.text];throw Error('Unknown data identifier '+n.text)}
 if(ts.isArrayLiteralExpression(n)){const a=[];for(const e of n.elements){if(ts.isSpreadElement(e)){const v=data(e.expression,scope);if(!Array.isArray(v))throw Error('Spread must be array');a.push(...v)}else a.push(data(e,scope))}return a}
 if(ts.isObjectLiteralExpression(n)){const o=Object.create(null);for(const p of n.properties){if(!ts.isPropertyAssignment(p))throw Error('Unsupported property');const key=safeKey(p.name.text);o[key]=data(p.initializer,scope)}return o}
 if(ts.isPropertyAccessExpression(n)){const o=data(n.expression,scope),key=safeKey(n.name.text);if(!o||!Object.hasOwn(o,key))throw Error('Unknown property');return o[key]}
 if(ts.isElementAccessExpression(n)){const a=data(n.expression,scope),key=safeKey(data(n.argumentExpression,scope));if(!Array.isArray(a)||!Number.isInteger(key)||key<0||key>=a.length)throw Error('Invalid array index');return a[key]}
 if(ts.isBinaryExpression(n)){const a=data(n.left,scope),b=data(n.right,scope);if(typeof a!=='number'||typeof b!=='number')throw Error('Numeric arithmetic only');if(n.operatorToken.kind===ts.SyntaxKind.PlusToken)return a+b;if(n.operatorToken.kind===ts.SyntaxKind.MinusToken)return a-b;throw Error('Unsupported arithmetic')}
 if(ts.isTemplateExpression(n)){let s=n.head.text;for(const span of n.templateSpans){const v=data(span.expression,scope);if(typeof v!=='number'&&typeof v!=='string')throw Error('Invalid template substitution');s+=String(v)+span.literal.text}return s}
 if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)&&n.expression.name.text==='map'&&n.arguments.length===1){const a=data(n.expression.expression,scope),fn=n.arguments[0];if(!Array.isArray(a)||a.length>20||!ts.isArrowFunction(fn)||fn.parameters.length!==1||!ts.isIdentifier(fn.parameters[0].name)||!ts.isTemplateExpression(fn.body))throw Error('Only bounded numeric path templates are supported');return a.map(y=>{if(typeof y!=='number')throw Error('Numeric values required');return data(fn.body,{...scope,[fn.parameters[0].name.text]:y})})}
 throw Error('Unsupported data expression: '+ts.SyntaxKind[n.kind]);
}
for(const statement of file.statements){if(!ts.isVariableStatement(statement))continue;for(const d of statement.declarationList.declarations){if(ts.isIdentifier(d.name)&&wanted.has(d.name.text)){if(Object.hasOwn(env,d.name.text))throw Error('Duplicate source variable');env[d.name.text]=data(d.initializer)}}}
for(const name of wanted)if(!Object.hasOwn(env,name))throw Error('Missing source variable '+name);
process.stdout.write(JSON.stringify(env));
