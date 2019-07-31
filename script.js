var MANHATTAN_GEO_URL = "manhattan.geojson"
var REQUESTS_URL = "requests.csv"
var VEHICLE_EVENTS_URL = "vehicle_events.csv"
var VEHICLE_PATHS_URL = "vehicle_paths_pnas_part.csv"

Promise.all([
    d3.json(MANHATTAN_GEO_URL),
    d3.csv(REQUESTS_URL),
    d3.csv(VEHICLE_PATHS_URL),
]).then(createChart);

// define global variable.
var mapData;
var request_24hours = []; // split the request.csv data into 24 hours
var serving_rate_select = [];
var vehicle_paths_24hours = []; // same with request_24hours but with different data
var vehicle_paths_select = [];
var projection;
var passanger_lower_num = 5, passanger_higher_num = 5;

function initData(allData){
    // initialize map data
    mapData = allData[0];
    // initialize reqeust_24hours data
    for(var i = 0; i < 24; i ++){
        request_24hours.push([]);
        vehicle_paths_24hours.push([]);
        serving_rate_select.push([i, i]);
        vehicle_paths_select.push([i, i]);
    }
    for(var i = 0; i < allData[1].length; i ++){
        var data = allData[1][i];
        var mdate = new Date(data.Timestamp * 1000);
        request_24hours[mdate.getHours()].push(data);
    }
    for(var i = 0; i < allData[2].length; i ++){
        var data = allData[2][i];
        var mdate = new Date(data.Timestamp * 1000);
        vehicle_paths_24hours[mdate.getHours()].push(data);
    }
    updateTable("serving");
    updateTable("rule");
    setTrigger("serving");
    setTrigger("rule");
    setRuleTrigger();
}

function setRuleTrigger(){
    var apply = document.getElementById("rule_apply_bound");
    var left = document.getElementById("rule_lower_bound");
    var right = document.getElementById("rule_higher_bound");
    left.value = passanger_lower_num;
    right.value = passanger_higher_num;
    apply.onclick = function(){
        var lv = parseInt(left.value);
        var rv = parseInt(right.value);
        if(lv && rv){
            if(lv <= rv){
                passanger_lower_num = lv;
                passanger_higher_num = rv
                createViolatingGraph();
            }else{
                alert("Left Must Smaller Than Right");
                return;
            }
        }else{
            alert("You Must Input An Integer.");
            return;
        }
    }
}

function updateTable(mtype){
    if(mtype == "serving"){
        var table = document.getElementById("serving_table");
        var data = serving_rate_select;
    }else{
        var table = document.getElementById("rule_table");
        var data = vehicle_paths_select;
    }
    table.innerHTML = "";
    if(table.length == 0){
        return ;
    }
    var i = 0;
    for(var j = 0; j < Math.ceil(data.length / 8); j ++){
        var row = table.insertRow(j);
        for(var k = 0; k < 8; k ++){
            var cell = row.insertCell(k);
            var elem = data[i];
            cell.innerHTML = elem[0] + "~" + (elem[1] + 1) + "h";
            i ++;
            if(i == data.length){
                return;
            }
        }
    }
}

function setTrigger(mtype){
    if(mtype == "serving"){
        var change_time = document.getElementById("serving_changebt");
        var addbt = document.getElementById("serving_addbt");
        var begin = document.getElementById("serving_begin");
        var begin_v = 0;
        var end = document.getElementById("serving_end");
        var apply = document.getElementById("serving_applybt");
        var reset = document.getElementById("serving_reset");
    }else{
        var change_time = document.getElementById("rule_changebt");
        var addbt = document.getElementById("rule_addbt");
        var begin = document.getElementById("rule_begin");
        var begin_v = 0;
        var end = document.getElementById("rule_end");
        var apply = document.getElementById("rule_applybt");
        var reset = document.getElementById("rule_reset");
    }
    change_time.onclick = function(){
        change_time.disabled = true;
        addbt.disabled = false;
        end.disabled = false;
        if(mtype == "serving"){
            serving_rate_select = [];
            document.getElementById("rule_changebt").disabled = true;
            updateTable("serving");
        }else{
            vehicle_paths_select = [];
            document.getElementById("serving_changebt").disabled = true;
            updateTable("rule");
        }
        document.getElementById("serving_reset").disabled = true;
        document.getElementById("rule_reset").disabled = true;
    }
    reset.onclick = function(){
        mselect = [];
        for(var i = 0; i < 24; i ++){
            mselect.push([i, i]);
        }
        if(mtype == "serving"){
            serving_rate_select = mselect;
            updateTable("serving");
            createServingRateGraph("serving_rate", "Serving Status Distrubution");
            createServingRateGraph("serving_rate_percent", "Serving Status Percent Distrubution");
        }else{
            vehicle_paths_select = mselect;
            updateTable("rule");
            createViolatingGraph();
        }
    }
    addbt.onclick = function(){
        var tv = parseInt(end.value);
        if(!tv){
            alert("value must be in 1~24");
            return ;
        }
        if(tv <= begin_v){
            alert("value should larger than " + begin_v);
            return ;
        }
        if(tv > 24){
            alert("value should smaller or equal than 24")
            return ;
        }
        if(mtype == "serving"){
            serving_rate_select.push([begin_v, tv-1]);
            updateTable("serving");
        }else{
            vehicle_paths_select.push([begin_v, tv-1]);
            updateTable("rule");
        }
        begin_v = tv;
        begin.innerText = tv;
        end.value = "";
        if(tv == 24){
            end.value = "";
            begin.innerText = 0;
            begin_v = 0;
            addbt.disabled = true;
            end.disabled = true;
            apply.disabled = false;
        }
    }
    apply.onclick = function(){
        // console.log(serving_rate_select);
        change_time.disabled = false;
        apply.disabled = true;
        // clear map
        var gMap = d3.select("#map");
            gMap.selectAll(".exceed_point").remove();
            gMap.selectAll(".road")
                .style("stroke", "rgb(51,102,153)")
                .style("stroke-width", 1);
        if(mtype == "serving"){
            createServingRateGraph("serving_rate", "Serving Status Distrubution");
            createServingRateGraph("serving_rate_percent", "Serving Status Percent Distrubution");
            document.getElementById("rule_changebt").disabled = false;
        }else{
            createViolatingGraph();
            document.getElementById("serving_changebt").disabled = false;
        }
        document.getElementById("serving_reset").disabled = false;
        document.getElementById("rule_reset").disabled = false;
    }
}

function buildDomainNameByTime(mselect){
    var name_ls = [];
    for(var i = 0; i < mselect.length; i ++){
        var elem = mselect[i];
        name_ls.push(elem[0] + "~" + (elem[1] + 1) + "h");
    }
    return name_ls;
}

function createChart(allData){
    initData(allData);

    createServingRateGraph("serving_rate", "Serving Status Distrubution");
    createServingRateGraph("serving_rate_percent", "Serving Status Percent Distrubution");
    createViolatingGraph();
    createMap();

    document.getElementById("serving_changebt").disabled = false;
    document.getElementById("rule_changebt").disabled = false;
    document.getElementById("rule_apply_bound").disabled = false;
    document.getElementById("rule_reset").disabled = false;
    document.getElementById("serving_reset").disabled = false;
    // addTimeTable();
}

function createMap(){
    // creat map
    var gMapSize = [550, 1100];
    var gMap = d3.select("#map")
                    .attr("width", gMapSize[0])
                    .attr("height", gMapSize[1])
                    .append("g");
    projection = d3.geoMercator()
                        .center([-73.88, 40.76])
                        .scale(Math.pow(2, 18))
                        .translate([gMapSize[0] + 100, 700]);
    var path = d3.geoPath()
                .projection(projection)
                .pointRadius(1);
    gMap.selectAll(".road")
    .data(mapData.features, function(d){return d.id;})
    .enter().append("path")
        .attr("class", "road")
        .attr("d", path);
    document.getElementById("map_area").scrollTop = 300;
}

function canculateServingData(svg_id){
    var serving_data = [];
    for(var i = 0; i < serving_rate_select.length; i ++){
        var elem = serving_rate_select[i];
        var success_data = [], fail_data = [];
        for(var j = elem[0]; j <= elem[1]; j ++){
            // console.log("add elem", j);
            for(var k = 0; k < request_24hours[j].length; k ++){
                var re = request_24hours[j][k];
                if(re.Actual_Dropoff == "-1" && re.Actual_Pickup == "-1"){
                    fail_data.push(re);
                }else{
                    success_data.push(re);
                }
            }
        }
        if(svg_id == "serving_rate"){
            serving_data.push({"success": success_data.length, "fail": -fail_data.length, "success_data": success_data, "fail_data": fail_data});
        }else{
            var ms = success_data.length, mf = fail_data.length;
            var mt = ms + mf;
            serving_data.push({"success": ms / mt, "fail": - mf / mt, "success_data": success_data, "fail_data": fail_data});
        }
    }
    return serving_data;
}

function createServingRateGraph(svg_id, title){
    // console.log(request_24hours[0][0]);
    // fetch data
    var serving_data = canculateServingData(svg_id);
    // console.log(serving_data);
    // set variable
    var barHeight = 20, barGap = 2;
    var gWidth = 500,  gHeight = (barGap * 2 + barHeight) * serving_rate_select.length;
    var gLeftPadding = 0, gTopPadding = 30, gBottomPadding = 30, gTitlePadding = 10;
    d3.select("#" + svg_id).selectAll("*").remove();
    var g = d3.select("#" + svg_id)
                .attr("width", gWidth + gLeftPadding)
                .attr("height", gHeight + gTopPadding + gBottomPadding + gTitlePadding);
    // add x axis
    var xAxisScale = d3.scaleLinear()
                        .domain([
                            d3.min(serving_data, function(d){return d["fail"];}), 
                            d3.max(serving_data, function(d){return d["success"];})])
                        .range([20, gWidth - 20]);
    g.append("g")
        .attr("transform", "translate("+ gLeftPadding + ", " + gTopPadding + ")")
        .call(
            d3.axisTop(xAxisScale)
                .tickValues(xAxisScale.ticks(5).concat(xAxisScale.domain()))
                .tickFormat(function(d){
                    if(svg_id == "serving_rate"){
                        return d3.format(".2s")(Math.abs(d));
                    }else{
                        return d3.format(".1%")(Math.abs(d));
                    }
                })
            );
    g.selectAll(".tick").append("line")
        .attr("stroke", "grey")
        .attr("y2", gHeight);
    // add y axis
    var y_domain_name = buildDomainNameByTime(serving_rate_select);
    var yAxisScale = d3.scaleBand().domain(y_domain_name).rangeRound([0, gHeight]);
    // add bar
    var bar = g.append("g")
        .attr("transform", "translate("+ gLeftPadding + ", " + gTopPadding + ")")
        .selectAll("rect")
        .append("g")
        .data(serving_data);
    bar.enter()
        .append("rect")
        .attr("height", barHeight)
        .attr("width", function(d){return gLeftPadding + (xAxisScale(d["success"]) - xAxisScale(0));})
        .attr("x", xAxisScale(0))
        .attr("y", function(d, i){return yAxisScale(y_domain_name[i]) + barGap;})
        .attr("class", "success_service_rate")
        .on("mouseover", function(d){
            d3.select(this).style("fill", "gold");
        })
        .on("mouseout", function(d){
            d3.select(this).style("fill", "chartreuse");
        })
        .on("click", function(d){
            var idls = [];
            for(var i = 0; i < d["success_data"].length; i ++){
                idls.push(d["success_data"][i].Requested_Pickup);
            }
            var gMap = d3.select("#map");
            gMap.selectAll(".exceed_point").remove();
            gMap.selectAll(".road")
                .style("stroke", "rgb(51,102,153)")
                .style("stroke-width", 1)
                .data(idls, function(d1){return d1.id ? d1.id : d1;})
                .style("stroke", "chartreuse")
                .style("stroke-width", 4);
        });
    bar.enter()
        .append("rect")
        .attr("height", barHeight)
        .attr("width", function(d){return (xAxisScale(0) - xAxisScale(d["fail"]));})
        .attr("x", function(d){return xAxisScale(d["fail"])})
        .attr("y", function(d, i) {return yAxisScale(y_domain_name[i]) + barGap;})
        .attr("class", "fail_service_rate")
        .on("mouseover", function(d){
            d3.select(this).style("fill", "gold");
        })
        .on("mouseout", function(d){
            d3.select(this).style("fill", "crimson");
        })
        .on("click", function(d){
            var idls = [];
            for(var i = 0; i < d["fail_data"].length; i ++){
                idls.push(d["fail_data"][i].Requested_Pickup);
            }
            var gMap = d3.select("#map");
            gMap.selectAll(".exceed_point").remove();
            gMap.selectAll(".road")
                .style("stroke", "rgb(51,102,153)")
                .style("stroke-width", 1)
                .data(idls, function(d1){return d1.id ? d1.id : d1;})
                .style("stroke", "crimson")
                .style("stroke-width", 4);
        });
    g.append("g")
        .attr("transform", "translate("+ (gLeftPadding + xAxisScale(0)) +", " + gTopPadding + ")")
        .selectAll("text")
        .data(y_domain_name)
        .enter()
        .append("text")
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("z-index", -99)
        .attr("y", function(d){return yAxisScale(d) + barGap + yAxisScale.bandwidth() / 2.0;})
        .text(function(d){return d;});
    // add text to faiil status
    g.append("g")
      .attr("transform", "translate("+ (xAxisScale(0) - 55) +", " + gTopPadding + ")")
      .selectAll("text").data(serving_data).enter()
      .append("text")
      .attr("font-size", "10px")
      .attr("z-index", -99)
      .attr("y", function(d, i) {return yAxisScale(y_domain_name[i]) + barGap + yAxisScale.bandwidth() / 2.0;})
      .text(function(d){
            if(svg_id == "serving_rate"){
                return d3.format(".2s")(Math.abs(d["fail"]));
            }else{
                return d3.format(".1%")(Math.abs(d["fail"]));
            }
        }
      );
    // add text to faiil status
    g.append("g")
      .attr("transform", "translate("+ (xAxisScale(0) + 30) +", " + gTopPadding + ")")
      .selectAll("text").data(serving_data).enter()
      .append("text")
      .attr("font-size", "10px")
      .attr("z-index", -99)
      .attr("y", function(d, i) {return yAxisScale(y_domain_name[i]) + barGap + yAxisScale.bandwidth() / 2.0;})
      .text(function(d){
            if(svg_id == "serving_rate"){
                return d3.format(".2s")(Math.abs(d["success"]));
            }else{
                return d3.format(".1%")(Math.abs(d["success"]));
            }
        }
      );

    // add title
    g.append("text")
        .attr("transform", "translate(" + (gWidth / 2) + ", " + (gHeight + gTopPadding + gBottomPadding + 5) + ")" )
        .attr("text-anchor", "middle")
        .text(title);
    // add legend
    var legend = g.append("g")
        .attr("transform", "translate(" + (gWidth * 0.8) + ", " + (gHeight + gTopPadding + 15) + ")" );
    legend.append("rect")
        .attr("class", "success_service_rate")
        .attr("y", -11)
        .attr("width", 13)
        .attr("height", 13);
    legend.append("rect")
        .attr("class", "fail_service_rate")
        .attr("y", 4)
        .attr("width", 13)
        .attr("height", 13);
    legend.append("text")
        .attr("transform", "translate(14, 0)")
        .attr("font-size", "14px")
        .text("success");
    legend.append("text")
        .attr("transform", "translate(14, 16)")
        .attr("font-size", "14px")
        .text("fail");
}

function createViolatingGraph(){
    // canculate data by time
    var vehicle_data = [];
    for(var i = 0; i < vehicle_paths_select.length; i ++){
        var elem = vehicle_paths_select[i];
        var tmp_data = [];
        for(var j = elem[0]; j <= elem[1]; j ++){
            for(var k = 0; k < vehicle_paths_24hours[j].length; k ++){
                var ve = vehicle_paths_24hours[j][k];
                var tmp = parseInt(ve.Num_Passengers);
                if(passanger_lower_num <= tmp && tmp <= passanger_higher_num){
                    tmp_data.push(ve);
                }
            }
        }
        vehicle_data.push(tmp_data);
    }
    var barHeight = 20, barGap = 2;
    var gHeight = (barGap * 2 + barHeight) * vehicle_data.length;
    var gLeftPadding = 30, gTopPadding = 30, gBottomPadding = 30, gTitlePadding = 10;
    var gWidth = 500 - gLeftPadding;
    d3.select("#violating_rule").selectAll("*").remove();
    var g = d3.select("#violating_rule")
                .attr("width", gWidth + gLeftPadding)
                .attr("height", gHeight + gTopPadding + gBottomPadding + gTitlePadding);
    // add x axis
    var xAxisScale = d3.scaleLinear()
                        .domain([0, d3.max(vehicle_data, function(d){return d.length;})])
                        .range([20, gWidth-50]);
    g.append("g")
        .attr("transform", "translate("+ gLeftPadding + ", " + gTopPadding + ")")
        .call(
            d3.axisTop(xAxisScale)
                .tickValues(xAxisScale.ticks(3).concat(xAxisScale.domain()))
                .tickFormat(d3.format(".2s"))
            );
    g.selectAll(".tick").append("line")
        .attr("stroke", "grey")
        .attr("y2", gHeight);
    // add y axis
    var y_domain_name = buildDomainNameByTime(vehicle_paths_select);
    var yAxisScale = d3.scaleBand().domain(y_domain_name).rangeRound([0, gHeight]);
    g.append("g")
        .attr("transform", "translate("+ (xAxisScale(0) + gLeftPadding - 3) +", " + gTopPadding + ")")
        .selectAll("text")
        .data(y_domain_name)
        .enter()
        .append("text")
        .attr("text-anchor", "end")
        .attr("font-size", "10px")
        .attr("z-index", -99)
        .attr("y", function(d){return yAxisScale(d) + barGap + yAxisScale.bandwidth() / 2.0;})
        .text(function(d){return d + " - ";});
    // add bar
    g.append("g")
        .attr("transform", "translate("+ gLeftPadding + ", " + gTopPadding + ")")
        .selectAll("rect").data(vehicle_data).enter()
        .append("rect")
        .attr("height", barHeight)
        .attr("width", function(d){return xAxisScale(d.length) - xAxisScale(0)})
        .attr("x", xAxisScale(0))
        .attr("y", function(d, i){return yAxisScale(y_domain_name[i]) + barGap;})
        .attr("class", "passanger_exceed4")
        .on("mouseover",function(d){
            d3.select(this).style("fill", "gold");
        })
        .on("mouseout", function(d){
            d3.select(this).style("fill", "darkorange");
        })
        .on("click", function(d){
            var gMap = d3.select("#map");
            gMap.selectAll(".road")
                .style("stroke", "rgb(51,102,153)")
                .style("stroke-width", 1);
            gMap.selectAll(".exceed_point").remove();
            gMap.selectAll("circle").data(d).enter()
                .append("circle")
                .attr("transform", function(d1){
                    return "translate(" + projection([d1.Longitude, d1.Latitude]) + ")";
                })
                .attr("r", 2)
                .attr("class", "passanger_exceed4 exceed_point")
        });
    // add bar text
    g.append("g")
        .attr("transform", "translate("+ (gLeftPadding + 100) + ", " + gTopPadding + ")")
        .selectAll("text").data(vehicle_data).enter()
        .append("text")
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("z-index", -99)
        .attr("y", function(d, i){return yAxisScale(y_domain_name[i]) + barGap + yAxisScale.bandwidth() / 2.0;})
        .text(function(d){return d3.format(".4s")(d.length);});
    // add title
    g.append("text")
        .attr("transform", "translate(" + (gWidth / 2) + ", " + (gHeight + gTopPadding + gBottomPadding + 5) + ")" )
        .attr("text-anchor", "middle")
        .text(passanger_lower_num + "~" + passanger_higher_num + " Passangers Time Distrubution");
}