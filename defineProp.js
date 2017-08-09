var obj = {name:"a", hobby : ["f","b"]};
Object.defineProperty(obj, "hobby", {
	get : function(){
		console.log("get..")
	},
	set : function(newVal){
		console.log("set.."+newVal);
	}
});
obj.hobby;
obj.hobby = ["f","a"];

