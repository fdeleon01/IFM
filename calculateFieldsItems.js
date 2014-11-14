function loadItem(itemId) {
    try {   
        itemRecord = nlapiLoadRecord('inventoryitem', itemId);
    } catch(SSS_RECORD_TYPE_MISMATCH) {     
        try {   
            itemRecord = nlapiLoadRecord('noninventoryitem', itemId);
        } catch(SSS_RECORD_TYPE_MISMATCH) {     
            try {
                itemRecord = nlapiLoadRecord('kititem', itemId);
            } catch(SSS_RECORD_TYPE_MISMATCH) {
                try {
                    itemRecord = nlapiLoadRecord('assemblyitem', itemId);
                } catch(SSS_RECORD_TYPE_MISMATCH) {
                    try {
                        itemRecord = nlapiLoadRecord('serviceitem', itemId);
                    } catch(SSS_RECORD_TYPE_MISMATCH) {
                       try{
                        itemRecord = nlapiLoadRecord('itemgroup', itemId);
                       }catch(e){
                            return "";
                       }
                    }
                    nlapiXMLToPDF     }
                }
            }
        }

        return itemRecord;
    }






function start(){

try{
  var usageThreshold = 40;
  var startRow = 0;
  var endRow = 1000;
  var resultCount = 0;
  var allResults = [];
  var columns = [];
  var filters = [];
  var parentsIds = [];
  var parent = 0;
  var output = "";
  var counter = 0;
  var counterSum = 0;
  var start = false;
  var arrayItems = [];
  var arrayInventoryGroup = [];
  var timeNow = new Date();
  timeNow = timeNow.toString();
  var arrayItemsToUpdate = [];
  var actualRecordId=nlapiGetRecordId();
  var filterGroups = [];


  nlapiLogExecution('ERROR', 'error','start');
  var actualRecord = nlapiLoadRecord('salesorder', actualRecordId, {recordmode: 'dynamic'});
  var counterItems = actualRecord.getLineItemCount('item');
  var filterInventory = [];

  for (var i = 1; i < counterItems; i++) {
     var typeItem = actualRecord.getLineItemValue('item', 'itemtype', i);

     if(typeItem == 'Group'){
       filterGroups.push(new nlobjSearchFilter('internalid', null, 'is', actualRecord.getLineItemValue('item', 'item', i)));
     }else if(typeItem != 'EndGroup' && typeItem != 'Group'){
      filterInventory.push(new nlobjSearchFilter('internalid', null, 'is', actualRecord.getLineItemValue('item', 'item', i)));
     }
     

  };
    
     
     
    for (var r = 0; r < filterInventory.length; r++) {
     
    
    var allResults = new nlapiSearchRecord(null, 117, filterInventory[r], null);
  

    for(var i = 0; i < allResults.length; i++) {

       

      var columnsSearch = allResults[i].getAllColumns();
      var internalId = allResults[i].getValue(columnsSearch[1]); 
      var nameParent = allResults[i].getValue(columnsSearch[0]);
      var atm = parseFloat(allResults[i].getValue(columnsSearch[2]));
      var atu = parseFloat(allResults[i].getValue(columnsSearch[4]));
      if(isNaN(atm))atm = 0;
      if(isNaN(atu))atu = 0;

      var filter = [];
      filter[0] = new nlobjSearchFilter('internalid', null, 'is', internalId);
      var searchResult = new nlapiSearchRecord(null, 109, filter, null);
       


      var filter2 = [];
      filter2[0] = new nlobjSearchFilter('item', null, 'is', internalId);

      var newSearchResult = new nlapiSearchRecord(null, 144, filter2, null);
      if(newSearchResult.length>0){
        var backOrder = 0;
        
        for (var x = 0; x < newSearchResult.length; x++) {
           var columnsSearch2 = newSearchResult[x].getAllColumns();
           var qty = parseFloat(newSearchResult[x].getValue(columnsSearch2[2]));
           backOrder+=qty;


         

        };
        nlapiLogExecution('ERROR', 'backOrder: ',backOrder);
      
      var itemAssembly = loadItem(internalId);  

      try{
      var itemQty = itemAssembly.getLineItemCount('member');
      }catch(e){
        var itemQty=0;
      }
      var calculationAvailable = true;
      for (var pos = 1; pos <= itemQty && calculationAvailable; pos++) {

           var internalidComponent = itemAssembly.getLineItemValue('member', 'item', pos);
           var itemMember = loadItem(internalidComponent); 
           var availableToDiscount = itemMember.getFieldValue('custitem_ignore_calculation');
           if(availableToDiscount == 'T')calculationAvailable = false;
      }
      

      if(calculationAvailable){    

      for (var z = 1; z <= itemQty; z++) {
        

        var internalidComponent = itemAssembly.getLineItemValue('member', 'item', z);
       
        var nameAssembly = itemAssembly.getLineItemText('member', 'item', z);
        var qtyNecesary = itemAssembly.getLineItemValue('member', 'quantity', z);
        var totaltoUpdate = qtyNecesary * backOrder;
        var itemMember = loadItem(internalidComponent); 
        var availableToDiscount = itemMember.getFieldValue('custitem_ignore_calculation');

        var objectGeneric =  setInventoryItems(internalidComponent,itemMember);
        var atuInMember = parseFloat(objectGeneric.availableToUse);
        var atmInMember = parseFloat(objectGeneric.availableToMake);
               
        if(isNaN(atuInMember))atmInMember = 0;
        if(isNaN(atmInMember))atmInMember = 0;


        if(arrayItems.length == 0){

   
           atuInMember = atuInMember - totaltoUpdate;
           var availableInventory  = atuInMember + atmInMember;  

           nlapiLogExecution('ERROR', 'available firstTime: ',availableInventory);        

          nlapiSubmitField(itemMember.getRecordType(),itemMember.getId(),'custitem_available_to_use',atuInMember,true); 
          nlapiSubmitField(itemMember.getRecordType(),itemMember.getId(),'custitem_available_to_make',atmInMember,true); 
          nlapiSubmitField(itemMember.getRecordType(),itemMember.getId(),'custitem_pending_work_order',totaltoUpdate,true); 
          nlapiSubmitField(itemMember.getRecordType(),itemMember.getId(),'custitem_total_available',availableInventory,true);
          nlapiSubmitField(itemMember.getRecordType(),itemMember.getId(),'custitem4',timeNow,true);  
          arrayItems.push(nameAssembly);

        }else if(arrayItems.indexOf(nameAssembly)!=-1){
        var valueInField = parseFloat(itemMember.getFieldValue('custitem_pending_work_order'))
        totaltoUpdate+=valueInField;
        atuInMember = atuInMember - totaltoUpdate;
        var availableInventory  = atuInMember + atmInMember;
        nlapiLogExecution('ERROR', 'available second: ',availableInventory);  
        
        nlapiSubmitField(itemMember.getRecordType(),itemMember.getId(),'custitem_available_to_use',atuInMember,true);
         nlapiSubmitField(itemMember.getRecordType(),itemMember.getId(),'custitem_available_to_make',atmInMember,true); 
        nlapiSubmitField(itemMember.getRecordType(),itemMember.getId(),'custitem_total_available',availableInventory,true); 
        nlapiSubmitField(itemMember.getRecordType(),itemMember.getId(),'custitem_pending_work_order',totaltoUpdate,true);
        nlapiSubmitField(itemMember.getRecordType(),itemMember.getId(),'custitem4',timeNow,true);  
          
        }else if(arrayItems.indexOf(nameAssembly)==-1){
         atuInMember = atuInMember - totaltoUpdate;
         var availableInventory  = atuInMember + atmInMember;
        nlapiLogExecution('ERROR', 'available third: ',availableInventory); 
         nlapiSubmitField(itemMember.getRecordType(),itemMember.getId(),'custitem_available_to_use',atuInMember,true);
         nlapiSubmitField(itemMember.getRecordType(),itemMember.getId(),'custitem_total_available',availableInventory,true); 
         nlapiSubmitField(itemMember.getRecordType(),itemMember.getId(),'custitem_pending_work_order',totaltoUpdate,true);
          nlapiSubmitField(itemMember.getRecordType(),itemMember.getId(),'custitem_available_to_make',atmInMember,true);  
         nlapiSubmitField(itemMember.getRecordType(),itemMember.getId(),'custitem4',timeNow,true); 
         arrayItems.push(nameAssembly);
        }       
      
      };
        
        atu = atu - backOrder;

        var totalAvailable = (atm + atu);
        
        nlapiLogExecution('ERROR', 'available on item search: ',totalAvailable); 

        nlapiSubmitField(searchResult[0].getRecordType(),searchResult[0].getId(),'custitem4',timeNow,true); 
        nlapiSubmitField(searchResult[0].getRecordType(),searchResult[0].getId(),'custitem_total_available',totalAvailable,true); 
        nlapiSubmitField(searchResult[0].getRecordType(),searchResult[0].getId(),'custitem_pending_work_order',0,true); 
        nlapiSubmitField(searchResult[0].getRecordType(),searchResult[0].getId(),'custitem_available_to_make',atm,true); 
        nlapiSubmitField(searchResult[0].getRecordType(),searchResult[0].getId(),'custitem_available_to_use',atu,true); 


       
       }
    }
      /*else{
        
        var itemAssembly = loadItem(internalId);

       

        var timeNow = new Date();
        timeNow = timeNow.toString();   
        //atu = atu - backOrder;     
        var totalAvailable = (atm + atu);
        

        nlapiSubmitField(itemAssembly.getRecordType(),internalId,'custitem4',timeNow,true); 
       // nlapiSubmitField(searchResult[0].getRecordType(),searchResult[0].getId(),'custitem_total_available',totalAvailable,true); 
        nlapiSubmitField(itemAssembly.getRecordType(),internalId,'custitem_total_available',0,true); 
        nlapiSubmitField(itemAssembly.getRecordType(),internalId,'custitem_available_to_make',atm,true); 
        nlapiSubmitField(itemAssembly.getRecordType(),internalId,'custitem_available_to_use',atu,true); 
        nlapiSubmitField(itemAssembly.getRecordType(),internalId,'custitem_pending_work_order',0,true); 



      }*/
     

    }
};
setTaInGroupitems(timeNow,filterGroups);



nlapiLogExecution('ERROR', 'Finish','Finish Script');

  }catch(e){
    nlapiLogExecution('ERROR', 'error',e);
  }

}





function setInventoryItems(internalidComponent,itemMember){



try{
var filter = [];
filter[0] = new nlobjSearchFilter('internalid', null, 'is', internalidComponent);
var searchResult = new nlapiSearchRecord(null, 222,filter,null);

if(searchResult.length > 0){
for (var i = 0; i < searchResult.length; i++) {
      var object = {};
      var columnsSearch = searchResult[i].getAllColumns();
      var backOrder = parseFloat(searchResult[i].getValue(columnsSearch[6]));
      var atu = parseFloat(searchResult[i].getValue(columnsSearch[4]));
      var atm = parseFloat(searchResult[i].getValue(columnsSearch[2]));


      if(isNaN(backOrder))backOrder=0;
      if(isNaN(atu))atu=0;
      if(isNaN(atm))atm=0;
      object.availableToUse = atu;
      object.availableToMake = 0;
 
};
  

}else{

  var filter = [];
filter[0] = new nlobjSearchFilter('internalid', null, 'is', internalidComponent);
var searchResult = new nlapiSearchRecord(null, 117,filter,null);

if(searchResult.length > 0){
for (var i = 0; i < searchResult.length; i++) {
      var object = {};
      var columnsSearch = searchResult[i].getAllColumns();
      var backOrder = parseFloat(searchResult[i].getValue(columnsSearch[6]));
      var atu = parseFloat(searchResult[i].getValue(columnsSearch[4]));
      var atm = parseFloat(searchResult[i].getValue(columnsSearch[2]));
      if(isNaN(backOrder))backOrder=0;
      if(isNaN(atu))atu=0;
      if(isNaN(atm))atm=0;
       
       object.availableToUse = atu;
       object.availableToMake = atm;
      
       
};
     

}

}

return object;

}catch(e){
  nlapiLogExecution('DEBUG', 'error', 'description:' + e);
}




}

function setTaInGroupitems(timeNow,filterGroups){

nlapiLogExecution('ERROR', 'start: ','setTaInGroupitems function');
try{

for (var i = 0; i < filterGroups.length; i++) {



var searchResult = new nlapiSearchRecord(null, 223,filterGroups[i],null);


if(searchResult.length > 0){


      var totalAvailableToUpdate = 0;

      var columnsSearch = searchResult[0].getAllColumns();
      var internalId = searchResult[0].getValue(columnsSearch[1]); 
      
      var nameParent = searchResult[0].getValue(columnsSearch[0]);
      var groupItem = loadItem(internalId);
      try{
        var itemType = groupItem.getFieldText('custitem_itemtype');
      }catch(e){
        var itemType = "";
      }
      
      var itemQty = groupItem.getLineItemCount('member');
      var arrayItemsQty = [];
      
      for (var z = 1; z <= itemQty; z++) {
        

        var internalidComponent = groupItem.getLineItemValue('member', 'item', z);
        var nameAssembly = groupItem.getLineItemText('member', 'item', z);
        var qtyNecesary = groupItem.getLineItemValue('member', 'quantity', z);
        var itemMember = loadItem(internalidComponent); 
        var totalAvailableMemeber = parseFloat(itemMember.getFieldValue('custitem_available_to_use'));
        
        nlapiLogExecution('ERROR', 'totalAvailableMemeber: ', totalAvailableMemeber);

        if(isNaN(totalAvailableMemeber)) totalAvailableMemeber = 0;
      
      if(totalAvailableMemeber > 0){
          totalAvailableToUpdate+=totalAvailableMemeber;
        }else if(totalAvailableToUpdate == 0 && totalAvailableMemeber < 0){
          totalAvailableToUpdate = totalAvailableMemeber;
        }else if(totalAvailableToUpdate > 0 && totalAvailableMemeber < 0  ){
            totalAvailableMemeber = totalAvailableMemeber * -1;
            totalAvailableToUpdate -= totalAvailableMemeber;
}
      

      }

       
       
       if(itemType == "Pre-Made"){
          nlapiSubmitField(groupItem.getRecordType(),internalId,'custitem_total_available',totalAvailableToUpdate,true); 
          nlapiSubmitField(groupItem.getRecordType(),internalId,'custitem_available_to_use',totalAvailableToUpdate,true); 
          nlapiSubmitField(groupItem.getRecordType(),internalId,'custitem_available_to_make',0,true); 
          nlapiSubmitField(groupItem.getRecordType(),internalId,'custitem4',timeNow,true); 
          nlapiLogExecution('ERROR', 'totalAvailableToUpdate Pre made: ', totalAvailableToUpdate);

       }else if(itemType == "In-House"){

        var itemMember = loadItem(groupItem.getLineItemValue('member', 'item', 1));
        var atm = parseFloat(itemMember.getFieldValue('custitem_available_to_make'));
        if(isNaN(atm))atm = 0;
       
        var totalInInhouse = atm + totalAvailableToUpdate;
 
        nlapiSubmitField(groupItem.getRecordType(),internalId,'custitem_total_available',totalInInhouse,true); 
        nlapiSubmitField(groupItem.getRecordType(),internalId,'custitem_available_to_use',totalAvailableToUpdate,true); 
        nlapiSubmitField(groupItem.getRecordType(),internalId,'custitem_available_to_make',atm,true); 
        nlapiSubmitField(groupItem.getRecordType(),internalId,'custitem4',timeNow,true); 
        nlapiLogExecution('ERROR', 'totalInInhouse:', totalInInhouse);
        nlapiLogExecution('ERROR', 'atm: ', atm);
        nlapiLogExecution('ERROR', 'totalAvailableToUpdate: ', totalAvailableToUpdate);

       }
      
  

      

}
};
}catch(e){
  nlapiLogExecution('ERROR', 'error: ','description: ' + e);
}
nlapiLogExecution('ERROR', 'finishGroup: ','group');

}




