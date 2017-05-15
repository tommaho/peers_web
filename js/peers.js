
'use strict';

var peers = (function(){
  
  var initReport, addRelativeRanks, getRelativeRank, compilePeerData, 
    reloadTable, getTargetPrograms, setProgramCounts, getMatchCounts;
  
  var p_table, is_initialized = false, program_counts = {}; 
  
	var current_parent, progress_bar_counter = 0;

  setProgramCounts = function(){ //counts is defined in the parent scope 
                                // and re-used after initialization
    var cur_unit_id;
    programs.forEach( function( element ) {
      cur_unit_id = element["UNITID"];
      if ( program_counts[ cur_unit_id ] ){
				program_counts[ cur_unit_id ] += 1;
			} 
			else {
				program_counts[ cur_unit_id ] = 1;
			};
    });
  };

  setProgramCounts(); 

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

  getTargetPrograms = function( whose ){
    return programs.filter(function test( x ){
			return x["UNITID"] == whose
		  }).map( function( x ){ return x["CIP-AW"] } ); 
  };
  var offloadRelativeRanks = function(who, peer_data, p_table){
   
   

    var worker = new Worker("js/relative_rank_worker.js");
    var for_who = peer_data.map(function(x){return x.thisid});
    worker.postMessage([who, for_who, programs]);
		
		document.getElementById('status').innerHTML = 'Calculating reverse ranks...';
   

		worker.onmessage = function(e){
				

			if (e.data[0] === current_parent || e.data[0] === 999999) {

				//console.log("signal value: ", e.data[1]);

				if (e.data[1] === 999999){
					//console.log("complete signal");
					document.getElementById('status').innerHTML = 'Calculations complete!';
				}
				else {
					var peer_row_id = p_table.rows(
					function (idx, data, node) {
						return data.thisid == e.data[1];
						}
					).indexes();
					
					$( "#progressbar" ).progressbar({ 
						value: progress_bar_counter
					});
					
					progress_bar_counter ++;

					try {
						p_table.cell(p_table.row(peer_row_id), p_table.column(16))
							.data(parseInt(e.data[2])).draw(false);      
						
					}
					catch (TypeError) {
						console.log("ERROR: Orphaned update callback, premature re-initializaion.");
						console.log("Lost data for:", e.data[1])
					}
				}
			}
		};
  
};
	compilePeerData = function( targetID ){

    var matches, target_programs, report, unit_ids,
		  ext_props, pct_match, pct_of_programs, report_line;
		report = [];	
	  target_programs = getTargetPrograms(targetID);
 
    matches = getMatchCounts(target_programs);
		unit_ids = Object.keys( matches ); //only do the work for schools 
                                      //having matches
  	unit_ids.forEach( function( unit ){
			if ( matches[unit] > 0 ){		//for each non-zero unitid in mathes:
				ext_props = schools.filter( function test( x ){
					return x["UNITID"] == unit
				} );
				
				pct_match = (matches[unit]  / matches[targetID]) * 100;
				pct_of_programs = (matches[unit] / program_counts[unit]) * 100;
				
				report_line = {
					"targetid": targetID,
					"thisid": unit,
					"unitid": "<a id=" + unit + " onClick='peers.initReport("
             + unit + ")' href='#'>" + unit + "</a>",
					"name": "<a target='_blank' href='" + ext_props[0]["URL"] + "'>" 
						 + ext_props[0]["NAME"]+ "</a>",
					//"url": ext_props[0]["URL"],
					"city": ext_props[0]["CITY"],
					"state": ext_props[0]["STATE"],
					"control": ext_props[0]["CONTROL"],
					"degree": ext_props[0]["DEGREE"],
					"locale": ext_props[0]["LOCALE"],
					"size": ext_props[0]["SIZE"],
					"programs": program_counts[unit],
					"matches": matches[unit],
					"pctMatch": pct_match.toFixed(2), 
					"pctOfPrograms": pct_of_programs.toFixed(2),
					"reverseRank" : 0, //will be loaded from web worker

				};
				report.push( report_line );
			};
				
			});
		
		return report.sort( function( a, b ){ 
			return b.pctMatch - a.pctMatch;
		  } ).slice( 0, 100 );;
	};

initReport = function ( who ){

  var dom_peer_table, peer_data;
  peer_data = compilePeerData( who );
	
	current_parent = who;
	progress_bar_counter = 0; //this is a module level variable to prevent progress bar jitter
														// when a parent is left and returned to while old reverse rank callbacks are still 
														// firing

	var rownum = 0, denseRank = 0, sparseRank = 1;

	var thisPctMatch = peer_data[0]['pctMatch'];
	var lastPctMatch = peer_data[0]['pctMatch'];

  peer_data.forEach(function( peer ){ 
		
		thisPctMatch = peer['pctMatch'];
		
		rownum += 1;

		if(thisPctMatch !== lastPctMatch){
			denseRank += 1;
			sparseRank = rownum;
		}

		lastPctMatch = thisPctMatch;

		peer['row'] = rownum;
		peer['rank'] = sparseRank; 
		//i++;
		peer['pctMatch'] += '%';
		peer['pctOfPrograms'] += '%'

	} ); //add manual rank instead of altering table cache
			// also add percentages here. If added during compilation, 
			// returned results are sorted as text
	
	if (is_initialized) {
		p_table
       .clear()
		   .rows.add( peer_data )
		   .draw();
	} 
	 else { 
	  
    p_table = $( '#peers' ).DataTable( {      
      "scrollY":  "500px",
      "scrollCollapse": true,
      "paging": false,
      "searching": true,
      "processing": true,
      data: peer_data,
      "columns": [
				{ "data": "row", "searchable": false },
        { "data": "rank", "searchable": false },
        { "data": "targetid", "visible": false },
        { "data": "thisid", "visible": false },
        { "data": "unitid" },
        { "data": "name"}, 
        { "data": "city"},
        { "data": "state"},
        { "data": "control"},
        { "data": "degree"},
        { "data": "locale"},
        { "data": "size"},
        { "data": "programs" },
        { "data": "matches" },
        { "data": "pctMatch" },
        { "data": "pctOfPrograms" },
        { "data": "reverseRank" }
      ]
    } );
       
    is_initialized = true;
  };
  offloadRelativeRanks(who, peer_data, p_table);
};
  return {
    initReport        : initReport,
    addRelativeRanks  : addRelativeRanks,
  };
})();