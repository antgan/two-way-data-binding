/** 
	双向绑定js
	Author： Abel Gan
	Datetime : 2017/08/09
 **/
var v = {};
(function(v){
	//主题
	function Topic(){
		this.subs = [];
	}
	//添加方法
	Topic.prototype = {
		addSub : function(sub){
			this.subs.push(sub);
		},
		notify : function(){
			this.subs.forEach(function(sub){
				sub.update();
			});
		}
	}
	//订阅者/观察者
	function Watcher(vm, node, name){
		//全局变量target，携带观察者
		Topic.target = this;
		this.vm = vm;
		this.node = node;
		this.name = name;
		//执行更新操作
		this.update();
		Topic.target = null;
	}
	//观察者添加方法
	Watcher.prototype = {
		update : function(){
			this.get();
			//如果是标签内嵌#text元素，用innerHTML去更新页面数据	
			if(this.node.nodeName != "#text"){
				this.node.innerHTML = this.value;
			}else{
				this.node.nodeValue = this.value;
			}
		},
		//获取data值
		get : function(){
			//触发getter，把全局target内的观察者添加到Topic的订阅者队列中
			this.value = this.vm.data[this.name];
		}
	}
	
	//分析节点类型，添加事件或添加观察者
	function compile(node, vm){
		var reg=/^\{\{([a-zA-Z0-9_]*)\}\}$/;
		// 节点类型为node元素
		if(node.nodeType == 1){
			//节点类型为node但内容是{{}}
			if(reg.test(node.innerHTML.trim())){
				var name = RegExp.$1;//获取匹配到的字符串
				name = name.trim();
				node.innerHTML = vm.data[name];
				new Watcher(vm, node, name);
			}else{
				var attr = node.attributes;
				//解析属性
				for(var i = 0; i < attr.length; i++){
					if(attr[i].nodeName == 'v-model'){
						var name = attr[i].nodeValue;
						//为各个成员变量添加事件
						if(node.nodeName == "SELECT"){
							node.addEventListener("change", function(e){
								vm.data[name] = e.target.value;
							});
						}else if(node.nodeName == "INPUT"){
							if(node.type == "radio"){
								node.addEventListener("change", function(e){
									vm.data[name] = e.target.value;
								});
							}else if(node.type == "checkbox"){
								node.addEventListener("click", function(e){
									if(node.checked){
										vm.data[name].push(e.target.value);
									}else{
										vm.data[name].removeByVal(e.target.value);
									}
								});
			
							}else if(node.type == "date"){
								node.addEventListener("change", function(e){
									vm.data[name] = e.target.value;
								});
							}else if(node.type == "text"){
								node.addEventListener("input", function(e){
									vm.data[name] = e.target.value;
								});
							}
						}
		
						//初始化页面，此处要注意radio和checkbox的特殊性
						if(node.nodeName == "INPUT" && node.type == "radio"){
							if(node.value == vm.data[name]){
								node.setAttribute("checked", "checked");
							}
						}else if(node.nodeName == "INPUT" && node.type == "checkbox"){
							vm.data[name].forEach(function(item,index){
								if(node.value == item){
									node.setAttribute("checked", "checked");
								}
							});
						}else if(node.nodeName == "SELECT"){
							var childNodes = node.options;
							for (var i=0, length=childNodes.length; i<length; i++) {
						     	if(childNodes[i].value == vm.data[name]){
						     		childNodes[i].setAttribute("checked", "checked");
						     	}
						    }  
							node.value = vm.data[name];
						}else{
							node.value = vm.data[name];
						}
						
						//初始化完毕后，删除属性
						// node.removeAttribute('v-model');
					}
				}
			}
		}
	 	//节点类型为text
		if(node.nodeType == 3){
			if(reg.test(node.nodeValue)){
				var name = RegExp.$1;//获取匹配到的字符串
				name = name.trim();
				node.nodeValue = vm.data[name];
				new Watcher(vm,node,name);
			}
		}
	};

	//[对外暴露接口]创建该node的分段Fragment，并且遍历所有子结点. iterator IE不支持
	v.traversal = function(node, vm){
		var iterator = document.createTreeWalker(node, NodeFilter.SHOW_ALL, false);
		var node = iterator.nextNode();
		while(node){
			compile(node,vm);
		    node = iterator.nextNode();  
		}
	};

	//为每一个model属性添加getter setter 以及主题监听
	function defineReactive(obj, key, val){
		var topic = new Topic();
		Object.defineProperty(obj, key, {
			get : function(){
				//添加订阅者Watcher到主题对象topic
				if(Topic.target){
					topic.addSub(Topic.target)
				}
				return val;
			},
			set : function(newVal){
				if(newVal === val) return;
				val = newVal;
				//作为发布者发出通知
	        	topic.notify();
			}
		});
	}

	//[对外暴露接口]给model的每个属性添加getter setter
	v.observe = function(data){
		for(var key in data){
			defineReactive(data, key, data[key]);
		}
	};

	//**[对外暴露接口]渲染
	//对象ID(唯一)，对象数据，模板ID，目标渲染ID, 渲染后回调方法
	v.render = function(modelId, data, templateId, targetId, fn){
		var target = document.getElementById(targetId);
		var template = document.getElementById(templateId);
		template.style.display = "none";
		var templateText = template.outerHTML;
		templateText = templateText.replace(templateId, modelId).replace("none","''");
		target.appendHTML(templateText);
		//创建VModel对象，同时添加双向绑定
		var newModel = new VModel({id: modelId, data: data});
		//回调
		fn();
		return newModel;
	};

	v.update = function(data, targetId){
		var target = document.getElementById(targetId);
		var obj = clone(data);
		var newModel = new VModel({id: targetId, target: targetId, data: obj});
		return newModel;
	};
})(v);

//原生追加HTML
HTMLElement.prototype.appendHTML = function(html) {
	var temp, nodes;
    var fragment = document.createDocumentFragment();
    //此处是因为tr,td,th等表格标签只能存在于table标签内。
	if(html.indexOf("tbody")>-1){
		temp = document.createElement("table");
	}else if(html.indexOf("tr")>-1){
		temp = document.createElement("tbody");
	}else{
		temp = document.createElement("div");
	}
    temp.innerHTML = html;  
    nodes = temp.childNodes;  
    for (var i=0, length=nodes.length; i<length; i+=1) {  
       fragment.appendChild(nodes[i].cloneNode(true));  
    }  
    this.appendChild(fragment);  
    //利于垃圾回收 
    nodes = null;
    fragment = null;
};

//Array添加移出方法
Array.prototype.indexOf = function(val) {
    for (var i = 0; i < this.length; i++) {
          if (this[i] == val) return i;
    }
    return -1;
};
Array.prototype.removeByVal = function(val) {
    var index = this.indexOf(val);
    if (index > -1) {
        this.splice(index, 1);
    }
};

function clone(obj){
    var result = {};
   	if (Array.isArray(obj)){
        result = [];
    }else{
        result = {};
    }
    // 遍历obj对象的每一个属性
    for (var key in obj){
        var val = obj[key];
       	if (Array.isArray(obj)){
        	result[key] = arguments.callee(val);
        }else{
            result[key] = obj[key];
        }
    }
    return result;
}

function VModel(options){
	this.id = options.id;
	this.data = options.data;

	if(this.id){
		var node = document.getElementById(this.id);
		//添加getter setter观察
		v.observe(this.data);
		//遍历所有子节点，并添加事件和发布订阅
		v.traversal(node, this);
	}
}