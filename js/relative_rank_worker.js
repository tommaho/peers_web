//returns an array of peers and ranks relative to target

var targetID, current_family, for_who, programs;

onmessage = function(e){
  targetID = e.data[0];
  for_who = e.data[1];
  programs = e.data[2];
  current_family = e.data[3];
  work();

  postMessage([999999, 999999, 0]); // complete
  
  //console.log("work complete");

};



function work(){
// // for all values in school list, calc rank relative to target

var reverseRankList = {};

 for_who.forEach( 
    function(school){
    postMessage([targetID, parseInt(school), getRelativeRank( school, targetID )])
    } );
 };



  getTargetPrograms = function( whose ){
    return programs.filter(function test( x ){
      if ( current_family == 0 ) { //0 means all sections, default
    	  return x["UNITID"] == whose 
      }
      else {
        return (x["UNITID"] == whose && x["FAMILY"] == current_family);
      }
		  
    }).map( function( x ){ return x["CIP-AW"] } ); 

  };


  getMatchCounts = function(target_programs){
	  var matches = {}, 
        match_count = 0,
        cur_unit_id;

    programs.forEach( function( element ) {
      cur_unit_id = element["UNITID"];
			
      if( target_programs.indexOf (element["CIP-AW"] ) >= 0){ 
        // if this cip_aw is in target_programs, we have a match
      	match_count = 1;


        if ( matches[ cur_unit_id ] ){ //if the in the matches array
          matches[ cur_unit_id ] += match_count; // add it
        } 
        else {
          matches[ cur_unit_id ] = match_count; 
        };
			} 
			else {
				match_count = 0;
			};

		});
    
    return matches;

  };

	getRelativeRank = function( parentID, targetID ){
      var matches, target_programs, rank_list, unit_ids, 
        pct_match, report_line;	

      rank_list = [];	
      target_programs = getTargetPrograms(parentID);
      matches = getMatchCounts(target_programs);

			for (var entry in matches) {
				rank_list.push([entry, matches[entry]]);
			};

			rank_list.sort(function( a, b ) {
				return b[1] - a[1];
			});

      console.log(rank_list);
      return rank_list.map(function(x){return parseInt(x[0])}).indexOf(targetID) + 1;
    
};