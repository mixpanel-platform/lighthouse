"use strict";require("../../base/base.js");require("../../base/rect.js");'use strict';global.tr.exportTo('tr.ui.b',function(){function instantiateTemplate(selector,doc){doc=doc||document;var el=Polymer.dom(doc).querySelector(selector);if(!el)throw new Error('Element not found');return doc.importNode(el.content,true);}function windowRectForElement(element){var position=[element.offsetLeft,element.offsetTop];var size=[element.offsetWidth,element.offsetHeight];var node=element.offsetParent;while(node){position[0]+=node.offsetLeft;position[1]+=node.offsetTop;node=node.offsetParent;}return tr.b.Rect.fromXYWH(position[0],position[1],size[0],size[1]);}function scrollIntoViewIfNeeded(el){var pr=el.parentElement.getBoundingClientRect();var cr=el.getBoundingClientRect();if(cr.top<pr.top){el.scrollIntoView(true);}else if(cr.bottom>pr.bottom){el.scrollIntoView(false);}}function extractUrlString(url){var extracted=url.replace(/url\((.*)\)/,'$1');extracted=extracted.replace(/\"(.*)\"/,'$1');return extracted;}function toThreeDigitLocaleString(value){return value.toLocaleString(undefined,{minimumFractionDigits:3,maximumFractionDigits:3});}function isUnknownElementName(name){return document.createElement(name)instanceof HTMLUnknownElement;}return{isUnknownElementName:isUnknownElementName,toThreeDigitLocaleString:toThreeDigitLocaleString,instantiateTemplate:instantiateTemplate,windowRectForElement:windowRectForElement,scrollIntoViewIfNeeded:scrollIntoViewIfNeeded,extractUrlString:extractUrlString};});