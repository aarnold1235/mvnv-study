//import * as d3 from 'd3';
deepmerge.all = function deepmergeAll(array, optionsArgument) {
  if (!Array.isArray(array) || array.length < 2) {
    throw new Error('first argument should be an array with at least two elements')
  }

  // we are sure there are at least 2 values, so it is safe to have no initial value
  return array.reduce(function(prev, next) {
    return deepmerge(prev, next, optionsArgument)
  })
}

class Model {
  /*
  The Model handels the loading, sorting, and ordering of the data.
   */
  private data: any;
  private matrix: any;
  private nodes: any;
  private edges: any;
  private order: any;
  private controller: any;
  private idMap;
  private orderType;
  public graph: any;
  private scalarMatrix: any;

  constructor(controller: any) {
    this.controller = controller;
    this.datumID = controller.datumID;

    d3.json(controller.configuration.graphFiles[controller.configuration.loadedGraph]).then((data: any) => {
      this.graph = data;
      this.edges = data.links;

      //setPanelValuesFromFile(controller.configuration, data);
      this.matrix = [];
      this.scalarMatrix = [];

      this.nodes = data.nodes
      this.populateSearchBox();
      this.idMap = {};

      let clusterFlag = false;
      if (this.controller.configuration.adjMatrix.sortKey in ['clusterBary', 'clusterLeaf', 'clusterSpectral']) {
        this.orderType = 'shortName';//this.controller.configuration.adjMatrix.sortKey;
        clusterFlag = true;
      } else {
        this.orderType = this.controller.configuration.adjMatrix.sortKey;
        console.log(this.order);

      }
      this.order = this.changeOrder(this.orderType);

      if (!this.isQuant(this.orderType)) {// == "screen_name" || this.orderType == "name") {
        this.nodes = this.nodes.sort((a, b) => a[this.orderType].localeCompare(b[this.orderType]));
      } else {
        this.nodes = this.nodes.sort((a, b) => { return b[this.orderType] - a[this.orderType]; });
      }

      this.nodes.forEach((node, index) => {
        node.index = index;
        this.idMap[node.id] = index;
      })


      this.controller = controller;

      this.processData();
      if (clusterFlag) {
        this.orderType = this.controller.configuration.adjMatrix.sortKey;

        this.order = this.changeOrder(this.orderType);
      }





      this.controller.loadData(this.nodes, this.edges, this.matrix);
      //})
    })
  }

  isQuant(attr) {
    // if not in list
    if (!Object.keys(this.controller.configuration.attributeScales.node).includes(attr)) {
      return false;
    } else if (this.controller.configuration.attributeScales.node[attr].range === undefined) {
      return true;
    } else {
      return false;
    }
  }


  populateSearchBox() {
    /*
    d3.select("#search-input").attr("list", "characters");
    let inputParent = d3.select("#search-input").node().parentNode;

    let datalist = d3
    .select(inputParent).selectAll('#characters').data([0]);

    let enterSelection = datalist.enter()
    .append("datalist")
    .attr("id", "characters");

    datalist.exit().remove();

    datalist= enterSelection.merge(datalist);

    let options = datalist.selectAll("option").data(this.nodes);

    let optionsEnter = options.enter().append("option");
    options.exit().remove();

    options = optionsEnter.merge(options);
    options.attr("value", d => d.shortName);
    options.attr("id", d => d.id);

    d3.select("#search-input").on("change", (d,i,nodes) => {
      let selectedOption = d3.select(nodes[i]).property("value");
      console.log(this.controller.view.search(selectedOption))
    });
*/
  }




  getApplicationState() {
    return {
      currentState: () => this.provenance.graph().current.state;
    };
  }

  private provenance: any;
  private app: any;



  setUpProvenance() {
    const initialState = {
      workerID: workerID,
      taskID: this.controller.tasks[this.controller.taskNum],
      nodes: '',//array of nodes that keep track of their position, whether they were softSelect or hardSelected;
      search: '', //field to store the id of a searched node;
      startTime: Date.now(), //time this provenance graph was created and the task initialized;
      endTime: '', // time the submit button was pressed and the task ended;
      time: Date.now(), //timestamp for the current state of the graph;
      count: 0,
      clicked: [],
      sortKey: this.controller.configuration.adjMatrix.sortKey,
      selections: {

        answerBox: {},
        attrRow: {},
        rowLabel: {},
        colLabel: {},
        neighborSelect: {},
        cellcol: {},
        cellrow: {},
        search: {}

      }
    };

    const provenance = ProvenanceLibrary.initProvenance(initialState);

    this.provenance = provenance;

    const app = this.getApplicationState();
    this.app = app;
    // creates the document with the name and worker ID
    //pushProvenance(app.currentState());
    const rowHighlightElements = d3.selectAll('.topoRow,.attrRow,.colLabel,.rowLabel')
    let columnElements = ['topoCol'];
    let rowElements = ['topoRow', 'attrRow']

    let elementNamesFromSelection = {
      cellcol: rowElements.concat(columnElements),
      colLabel: rowElements.concat(columnElements).concat(['colLabel']),// splice out rowLabel TODO:
      rowLabel: rowElements.concat(columnElements).concat(['rowLabel']),// splice out colLabel
      attrRow: rowElements.concat(['rowLabel']),
      cellrow: rowElements.concat(columnElements),
      neighborSelect: rowElements,
      answerBox: rowElements.concat(columnElements),
      search: rowElements.concat(columnElements)
    }

    function classAllHighlights(state) {
      let clickedElements = new Set();
      let answerElements = new Set();
      let neighborElements = new Set();


      for (let selectionType in state.selections) {
        for (let selectionElement in elementNamesFromSelection[selectionType]) {
          selectionElement = elementNamesFromSelection[selectionType][selectionElement];
          for (let node in state.selections[selectionType]) {

            if (selectionType == 'answerBox') {
              answerElements.add('#' + selectionElement + node)
            } else if (selectionType == 'neighborSelect') {
              neighborElements.add('#' + selectionElement + node)
            } else {
              if (selectionType == 'attrRow' || selectionType == 'rowLabel') {
                // if both in attrRow and rowLabel, don't highlight element
                if (node in state.selections['attrRow'] && node in state.selections['rowLabel']) continue;
              }
              clickedElements.add('#' + selectionElement + node)
            }
          }
        }
      }

      let clickedSelectorQuery = Array.from(clickedElements).join(',')
      let answerSelectorQuery = Array.from(answerElements).join(',')
      let neighborSelectQuery = Array.from(neighborElements).join(',')
      console.log(clickedSelectorQuery);
      clickedSelectorQuery != [] ? d3.selectAll(clickedSelectorQuery).classed('clicked', true) : null;
      answerSelectorQuery != [] ? d3.selectAll(answerSelectorQuery).classed('answer', true) : null;
      neighborSelectQuery != [] ? d3.selectAll(neighborSelectQuery).classed('neighbor', true) : null;

      return;
    }

    function setUpObservers() {
      let updateHighlights = (state) => {
        d3.selectAll('.clicked').classed('clicked', false);
        d3.selectAll('.answer').classed('answer', false);
        d3.selectAll('.neighbor').classed('neighbor', false);

        classAllHighlights(state);
      };

      let updateCellClicks = (state) => {
        let cellNames = [];
        Object.keys(state.selections.cellcol).map(key => {
          let names = state.selections.cellcol[key];
          names.map(name => {
            let cellsNames = splitCellNames(name);
            cellNames = cellNames.concat(cellsNames)
          })

          //names.map(name=>{
          //})
        })
        let cellSelectorQuery = '#' + cellNames.join(',#')
        // if no cells selected, return
        d3.selectAll('.clickedCell').classed('clickedCell', false);
        if (cellSelectorQuery == '#') return;
        d3.selectAll(cellSelectorQuery).selectAll('.baseCell').classed('clickedCell', true)

      }

      let updateAnswerBox = (state) => {
        window.controller.configuration.adjMatrix['toggle'] ? window.controller.view.updateAnswerToggles(state) : window.controller.view.updateCheckBox(state);
        //window.controller.view.updateAnswerToggles(state)
        let answer = [];
        for (let i = 0; i < window.controller.model.nodes.length; i++) {
          if (window.controller.model.nodes[i][this.controller.view.datumID] in state.selections.answerBox) {
            answer.push(window.controller.model.nodes[i]);
          }
        }
        updateAnswer(answer);


      }
      provenance.addObserver("selections.attrRow", updateHighlights)
      provenance.addObserver("selections.rowLabel", updateHighlights)
      provenance.addObserver("selections.colLabel", updateHighlights)
      provenance.addObserver("selections.cellcol", updateHighlights)
      provenance.addObserver("selections.cellrow", updateHighlights)
      provenance.addObserver("selections.neighborSelect", updateHighlights)
      provenance.addObserver("selections.cellcol", updateCellClicks)

      provenance.addObserver("selections.search", updateHighlights)
      provenance.addObserver("selections.answerBox", updateHighlights)
      provenance.addObserver("selections.answerBox", updateAnswerBox)

    }
    setUpObservers();


    return [app, provenance];


  }




  reload() {
    this.controller.loadData(this.nodes, this.edges, this.matrix);
  }

  /**
   *   Determines the order of the current nodes
   * @param  type A string corresponding to the attribute screen_name to sort by.
   * @return      A numerical range in corrected order.
   */
  changeOrder(type: string) {
    let order;
    this.orderType = type;
    this.controller.configuration.adjMatrix.sortKey = type;
    if (type == "clusterSpectral" || type == "clusterBary" || type == "clusterLeaf") {
      /*var graph = reorder.graph()
        .nodes(this.nodes)
        .links(this.edges)
        .init();*/ //"favourites_count"
      var graph = reorder.graph()
        .nodes(this.nodes)
        .links(this.edges)
        .init();

      if (type == "clusterBary") {
        var barycenter = reorder.barycenter_order(graph);
        order = reorder.adjacent_exchange(graph, barycenter[0], barycenter[1])[1];
      } else if (type == "clusterSpectral") {
        order = reorder.spectral_order(graph);
      } else if (type == "clusterLeaf") {
        let mat = reorder.graph2mat(graph);
        order = reorder.optimal_leaf_order()(mat);
      }

      //

      //order = reorder.optimal_leaf_order()(this.scalarMatrix);
    }
    else if(this.orderType =='edges'){
      order = d3.range(this.nodes.length).sort((a, b) => this.nodes[a][type].length -this.nodes[b][type].length);
    }
    else if (!this.isQuant(this.orderType)) {// == "screen_name" || this.orderType == "name") {
      order = d3.range(this.nodes.length).sort((a, b) => this.nodes[a][type].localeCompare(this.nodes[b][type]));
    }  else {
      order = d3.range(this.nodes.length).sort((a, b) => { return this.nodes[b][type] - this.nodes[a][type]; });
    }

    this.order = order;
    return order;
  }
  private maxTracker: any;
  /**
   * [processData description]
   * @return [description]
   */
  processData() {
    // generate a hashmap of id's?
    // Set up node data
    this.nodes.forEach((rowNode, i) => {
      rowNode.count = 0;

      /* Numeric Conversion */
      rowNode.followers_count = +rowNode.followers_count;
      rowNode.query_tweet_count = +rowNode.query_tweet_count;
      rowNode.friends_count = +rowNode.friends_count;
      rowNode.statuses_count = +rowNode.statuses_count;
      rowNode.favourites_count = +rowNode.favourites_count;
      rowNode.count_followers_in_query = +rowNode.count_followers_in_query;
      //rowNode.id = +rowNode.id;
      rowNode.y = i;


      /* matrix used for edge attributes, otherwise should we hide */
      this.matrix[i] = this.nodes.map((colNode) => { return { cellName: 'cell' + rowNode[this.datumID] + '_' + colNode[this.datumID], correspondingCell: 'cell' + colNode[this.datumID] + '_' + rowNode[this.datumID], rowid: rowNode[this.datumID], colid: colNode[this.datumID], x: colNode.index, y: rowNode.index, count: 0, z: 0, interacted: 0, retweet: 0, mentions: 0 }; });
      this.scalarMatrix[i] = this.nodes.map(function(colNode) { return 0; });

    });
    function checkEdge(edge) {
      if (typeof edge.source !== "number") return false
      if (typeof edge.target !== "number") return false;
      return true
    }
    this.edges = this.edges.filter(checkEdge);
    this.maxTracker = { 'reply': 0, 'retweet': 0, 'mentions': 0 }
    // Convert links to matrix; count character occurrences.
    this.edges.forEach((link) => {


      let addValue = 1;
      this.matrix[this.idMap[link.source]][this.idMap[link.target]][link.type] += link.count;
      //
      this.scalarMatrix[this.idMap[link.source]][this.idMap[link.target]] += link.count;


      /* could be used for varying edge types */
      //this.maxTracker = { 'reply': 3, 'retweet': 3, 'mentions': 2 }
      this.matrix[this.idMap[link.source]][this.idMap[link.target]].z += addValue;

      this.matrix[this.idMap[link.source]][this.idMap[link.target]].count += 1;
      // if not directed, increment the other values
      if (!this.controller.configuration.isDirected) {
        this.matrix[this.idMap[link.target]][this.idMap[link.source]].z += addValue;
        this.matrix[this.idMap[link.target]][this.idMap[link.source]][link.type] += link.count;
        this.scalarMatrix[this.idMap[link.source]][this.idMap[link.target]] += link.count;

      }
      link.source = this.idMap[link.source];
      link.target = this.idMap[link.target];
    });
  }

  getOrder() {
    return this.order;
  }

  /**
   * Returns the node data.
   * @return Node data in JSON Array
   */
  getNodes() {
    return this.nodes;
  }

  /**
   * Returns the edge data.
   * @return Edge data in JSON Array
   */
  getEdges() {
    return this.edges;
  }

}

// Work on importing class file
class View {
  /*
  The Model handels the loading, sorting, and ordering of the data.
   */
  private controller: any;
  private nodes: any;
  private edges: any;
  private matrix: any;

  private viewWidth: number;

  private edgeWidth: number;
  private edgeHeight: number;
  private attributeWidth: number;
  private attributeHeight: number;
  private datumID: string;
  private mouseoverEvents: Array<any>;
  private clickFunction: any;

  private margins: { left: number, top: number, right: number, bottom: number };
  private orderings: [number];
  private attributes: any;
  private orderingScale: d3.ScaleBand<number>;
  private edgeRows: any;
  private edgeColumns: any;
  private edgeScales: any;
  private visWidth: number;
  private visHeight: number;
  /*
  private edgeSVGWidth: number;
  private edgeSVGHeight: number;
  private edgeSVGMargin: any;
  private edgeSVG: any;

  private xScale: d3.ScaleBand<string>;
  private edgeValueScale: d3.ScaleLinear<number,number>;
  private colorScale: d3.ScaleOrdinal<any,any>;
  private orders: any;
*/

  constructor(controller) {
    this.controller = controller;

    this.controller.clickedCells = new Set();
    this.datumID = controller.datumID;
    this.clickFunction = (d, i, nodes) => {

      let nodeID = this.controller.view.determineID(d);
      // remove hover or clicked from the class name of the objects that are interacted
      // this is necessary as the click events are attached to the hovered rect in attrRow
      let interaction = d3.select(nodes[i]).attr('class');

      interaction = interaction.replace(' hoveredCell', '');
      interaction = interaction.replace(' hovered', '');
      interaction = interaction.replace(' clicked', '');
      interaction = interaction.replace(' answer', '');
      interaction = interaction.replace(' neighbor', '');
      let action = this.controller.view.changeInteractionWrapper(nodeID, nodes[i], interaction);
      this.controller.model.provenance.applyAction(action);
      //pushProvenance(this.controller.model.app.currentState())

    };
    // set up load
    this.renderLoading();
    this.mouseoverEvents = [];

    // Add scroll handler to containers
    d3.selectAll('.container').on('mousewheel', scrollHandler);

    function scrollHandler() {
      // determine which didn't scroll and update it's scroll.
      let scrollHeight = d3.select(this).node().scrollTop;
      if (d3.select(this).attr('id') == "attributes") {
        // scroll topology
        let element: any = d3.select('#topology').node();
        element.scrollTop = scrollHeight;
      } else {
        // scroll attributes
        let element: any = d3.select('#attributes').node()
        element.scrollTop = scrollHeight;
      }
    }
  }

  /**
   * Search node function
   * @param  searchNode [description]
   * @return            [description]
   */
  search(searchNode) {
    let selectedOption = searchNode//d3.select(nodes[i]).property("value");
    console.log(selectedOption);

    if (selectedOption.length === 0) {
      return;
    }

    //find the right nodeObject
    let name = this.nodes.filter(node => { return node.shortName == selectedOption });

    if (name[0] == null || name[0][this.datumID] == '') return -1; // node was not found
    name = name[0][this.datumID];

    let action = this.controller.view.changeInteractionWrapper(name, null, 'search');
    this.controller.model.provenance.applyAction(action);
    return 1;
  }



  /**
   * Takes in the data, hides the loading screen, and
   * initalizes visualization.
   * @param  data [description]
   * @return      [description]
   */
  loadData(nodes: any, edges: any, matrix: any) {
    this.nodes = nodes
    this.edges = edges;
    this.matrix = matrix;

    this.hideLoading();
    this.renderView();

  }


  /**
   * Initializes the adjacency matrix and row views with placeholder visualizations
   * @return [description]
   */
  renderView() {
    d3.select('.loading').style('display', 'block').style('opacity', 1);
    this.viewWidth = 1000;

    this.margins = { left: 75, top: 75, right: 0, bottom: 10 };

    this.initalizeEdges();
    this.initalizeAttributes();
    d3.select('.loading').style('display', 'none');

  }

  /**
   * Initalizes the edges view, renders all SVG elements and attaches listeners
   * to elements.
   * @return None
   */
  initalizeEdges() {
    // Float edges so put edges and attr on same row
    d3.select('#topology').style('float', 'left');

    // Set width and height based upon the calculated layout size
    let width = this.controller.visWidth * this.controller.edgePorportion;
    let height = this.controller.visHeight;

    this.edgeWidth = width - (this.margins.left + this.margins.right)//*this.controller.edgePorportion;
    this.edgeHeight = height - (this.margins.top + this.margins.bottom)//*this.controller.edgePorportion;

    // Creates scalable SVG
    this.edges = d3.select('#topology').append("svg")
      .attr("viewBox", "0 0 " + (width) + " " + height + "")
      .attr("preserveAspectRatio", "xMinYMin meet")
      .append("g")
      .classed("svg-content", true)
      .attr('id', 'edgeMargin')
      .attr("transform", "translate(" + this.margins.left + "," + this.margins.top + ")")

    // sets the vertical scale
    this.orderingScale = d3.scaleBand<number>().range([0, this.edgeWidth]).domain(d3.range(this.nodes.length));

    // creates column groupings
    this.edgeColumns = this.edges.selectAll(".column")
      .data(this.matrix)
      .enter().append("g")
      .attr("class", "column")
      .attr("transform", (d, i) => {
        return "translate(" + this.orderingScale(i) + ")rotate(-90)";
      });







    // Draw each row
    this.edgeRows = this.edges.selectAll(".row")
      .data(this.matrix)
      .enter().append("g")
      .attr("class", "row")
      .attr("transform", (d, i) => {
        return "translate(0," + this.orderingScale(i) + ")";
      });


    this.drawGridLines();
    this.drawHighlightElements();

    this.edgeScales = {};

    this.controller.configuration.attributeScales.edge.type.domain.forEach(type => {
      // calculate the max
      let extent = [0, this.controller.configuration.attributeScales.edge.count.domain[1]];
      //model.maxTracker[type]]
      // set up scale
      console.log(extent);
      let typeIndex = this.controller.configuration.attributeScales.edge.type.domain.indexOf(type);

      //let scale = d3.scaleLinear().domain(extent).range(["white", this.controller.configuration.attributeScales.edge.type.range[typeIndex]]);
      //let otherColors = ['#064B6E', '#4F0664', '#000000']

      let scale = d3.scaleSqrt().domain(extent).range(["white", this.controller.configuration.attributeScales.edge.type.range[typeIndex]);

      scale.clamp(true);
      // store scales
      this.edgeScales[type] = scale;
    });

    this.generateColorLegend();
    var cells = this.edgeRows.selectAll(".cell")
      .data(d => { return d/*.filter(item => item.z > 0)*/ })
      .enter().append('g')
      .attr("class", "cell")
      .attr('id', d => d.cellName)
      .attr('transform', d => 'translate(' + this.orderingScale(d.x) + ',0)')
    let squares = cells
      .append("rect")
      .classed('baseCell', true)
      .attr("x", d => 0)
      .attr('height', this.orderingScale.bandwidth())
      .attr('width', this.orderingScale.bandwidth())
      .attr('fill-opacity', 0);
    if (this.controller.configuration.adjMatrix.edgeBars) {
      // bind squares to cells for the mouse over effect



      let dividers = this.controller.configuration.isMultiEdge ? 2 : 1;

      //let squares = cells
      let offset = 0;
      let squareSize = this.orderingScale.bandwidth() - 2 * offset;
      for (let index = 0; index < dividers; index++) {

        let type = this.controller.configuration.isMultiEdge ? this.controller.configuration.attributeScales.edge.type.domain[index] : 'interacted';
        console.log(this.edgeScales, type)
        let scale = this.edgeScales[type];
        let typeColor = scale.range()[1];
        // change encoding to position
        //scale.range([0, this.orderingScale.bandwidth()])
        //scale.clamp(true);

        cells
          //.filter(d => {
          //  return d[type] !== 0;
          //})
          .append("rect")
          .classed('nestedEdges nestedEdges' + type, true)
          .attr('x', offset)// index * this.orderingScale.bandwidth() / dividers })
          .attr('y', (d) => {
            return offset//this.orderingScale.bandwidth() - scale(d[type]);
          })
          .attr('height', squareSize)//)
          .attr('width', squareSize)
          .attr('fill', d => this.edgeScales[type](d[type]));
        offset = squareSize / 4;
        squareSize = squareSize - 2 * offset;

      }
      cells
        .selectAll('.nestedEdges')
        .filter(d => {
          return d.mentions == 0 && d.retweet == 0 && d.interacted == 0;
        })
        .remove();


    } else {
      let squares = cells
        .append("rect")
        .attr("x", 0)//d => this.orderingScale(d.x))
        //.filter(d=>{return d.item >0})
        .attr("width", this.orderingScale.bandwidth())
        .attr("height", this.orderingScale.bandwidth())
        .style("fill", 'white')
      squares
        .filter(d => d.z == 0)
        .style("fill-opacity", 0);
      this.setSquareColors('all');
    }
    let that = this;
    cells
      .on("mouseover", (cell, i, nodes) => {

        let matrix = nodes[i].getScreenCTM()
          .translate(+nodes[i].getAttribute("x"), +nodes[i].getAttribute("y"));

        let interactedMessage = cell.interacted > 0 ? cell.interacted.toString() + " interactions" : '';//
        if (cell.interacted == 1) {
          interactedMessage = interactedMessage.substring(0, interactedMessage.length - 1)
        }
        let retweetMessage = cell.retweet > 0 ? cell.retweet.toString() + " retweets" : '';//
        if (cell.retweet == 1) {
          retweetMessage = retweetMessage.substring(0, retweetMessage.length - 1)
        }
        let mentionsMessage = cell.mentions > 0 ? cell.mentions.toString() + " mentions" : '';//
        if (cell.mentions == 1) {
          mentionsMessage = mentionsMessage.substring(0, mentionsMessage.length - 1)
        }

        let message = [interactedMessage, retweetMessage, mentionsMessage].filter(Boolean).join("</br>");//retweetMessage+'</br>'+mentionsMessage
        console.log(message);

        if (message !== '') {
          let yOffset = (retweetMessage !== '' && mentionsMessage !== '') ? 45 : 30;
          console.log(yOffset);
          this.tooltip.html(message)
            .style("left", (window.pageXOffset + matrix.e - 45) + "px")
            .style("top", (window.pageYOffset + matrix.f - yOffset) + "px");

          this.tooltip.transition()
            .delay(100)
            .duration(200)
            .style("opacity", .9);
        }



        let cellIDs = [cell.cellName, cell.correspondingCell];

        this.selectedCells = cellIDs;
        this.selectedCells.map(cellID => {
          d3.selectAll('#' + cellID).selectAll('.baseCell').classed('hoveredCell', true);
        })
        let cellID = cellIDs[0];

        that.addHighlightNodesToDict(this.controller.hoverRow, cell.rowid, cellID);  // Add row (rowid)
        if (cell.colid !== cell.rowid) {
          that.addHighlightNodesToDict(this.controller.hoverRow, cell.colid, cellID);  // Add row (colid)
          that.addHighlightNodesToDict(this.controller.hoverCol, cell.rowid, cellID);  // Add col (rowid)
        }

        // add mouseover events
        this.mouseoverEvents.push({ time: new Date().getTime(), event: cellID })

        that.addHighlightNodesToDict(this.controller.hoverCol, cell.colid, cellID);  // Add col (colid)
        d3.selectAll('.hovered').classed('hovered', false);
        that.renderHighlightNodesFromDict(this.controller.hoverRow, 'hovered', 'Row');
        that.renderHighlightNodesFromDict(this.controller.hoverCol, 'hovered', 'Col');
      })
      .on("mouseout", (cell) => {
        this.tooltip.transition(25)
          .style("opacity", 0);
        let func = this.removeHighlightNodesToDict;
        d3.selectAll('.hoveredCell').classed('hoveredCell', false);
        this.selectedCells = [];

        let cellID = cell.cellName;
        that.removeHighlightNodesToDict(this.controller.hoverRow, cell.rowid, cellID);  // Add row (rowid)
        if (cell.colid !== cell.rowid) {
          that.removeHighlightNodesToDict(this.controller.hoverRow, cell.colid, cellID);
          that.removeHighlightNodesToDict(this.controller.hoverCol, cell.rowid, cellID);  // Add col (rowid)
        }
        // Add row (colid)
        that.removeHighlightNodesToDict(this.controller.hoverCol, cell.colid, cellID);  // Add col (colid)
        d3.selectAll('.hovered').classed('hovered', false);
        //that.renderHighlightNodesFromDict(this.controller.hoverRow,'hovered','Row');
        //that.renderHighlightNodesFromDict(this.controller.hoverCol,'hovered','Col');
      })
      .on('click', (d, i, nodes) => {
        // only trigger click if edge exists
        if (d.interacted != 0 || d.retweet != 0 || d.mentions != 0) {
          this.clickFunction(d, i, nodes);

        }
        return;
      })
    /*(d, i, nodes) => {

      let nodeID = this.determineID(d);

      let action = this.changeInteractionWrapper(nodeID, i, nodes);
      this.controller.model.provenance.applyAction(action);


    });*/

    /*      .on("click", (cell, index, nodes) => {
            let cellElement = d3.select(nodes[index]).selectAll('rect');
            let cellID = cell.rowid + cell.colid;

            if (cell.interacted != 0 || cell.mentions != 0 || cell.retweets != 0) {

            }

            cellElement.classed('clickedCell', !this.controller.clickedCells.has(cellID))


            if (this.controller.clickedCells.has(cellID)) {
              this.controller.clickedCells.delete(cellID);
              that.removeHighlightNodesToDict(this.controller.clickedRow, cell.rowid, cellID);  // Add row (rowid)
              if (cell.colid !== cell.rowid) {
                that.removeHighlightNodesToDict(this.controller.clickedRow, cell.colid, cellID);  // Add row (colid)
              }
              that.removeHighlightNodesToDict(this.controller.clickedCol, cell.colid, cellID);  // Add col (colid)
            } else {
              this.controller.clickedCells.add(cellID);
              that.addHighlightNodesToDict(this.controller.clickedRow, cell.rowid, cellID);  // Add row (rowid)
              if (cell.colid !== cell.rowid) {
                that.addHighlightNodesToDict(this.controller.clickedRow, cell.colid, cellID);  // Add row (colid)
              }

              that.addHighlightNodesToDict(this.controller.clickedCol, cell.colid, cellID);  // Add col (colid)
            }

            d3.selectAll('.clicked').classed('clicked', false);
            that.renderHighlightNodesFromDict(this.controller.clickedRow, 'clicked', 'Row');
            that.renderHighlightNodesFromDict(this.controller.clickedCol, 'clicked', 'Col');

          });*/
    // color squares


    this.controller.clickedRow = {}
    this.controller.clickedCol = {}
    this.controller.answerRow = {}
    this.controller.hoverRow = {}
    this.controller.hoverCol = {}

    function mouseoverCell(p) {
      // Add row (colid)
      // Add col (colid)

      /*let attrPrimaryRow = that.selectHighlight(p,"Row","Attr"),
          topologyPrimaryRow = that.selectHighlight(p,"Row","Topo",'y'),
          attrSecondaryRow = that.selectHighlight(p,"Row","Attr"),
          topologySecondaryCol = that.selectHighlight(p,"Col","Topo",'x');

      attrPrimaryRow.classed('hovered',true);
      topologyPrimaryRow.classed('hovered',true);
      attrSecondaryRow.classed('hovered',true);
      topologySecondaryCol.classed('hovered',true);*/
      //that.highlightRow(p);
      //that.highlightRowAndCol(p);

      /*
      let test1 = d3.selectAll(".highlightRow") // secondary
        .filter((d, i) => {
          if (d.index != null) {
            return p.y == d.index;
          }
          return d[i].y == p.y;
        })
        .classed("hovered", true);

      that.attributes.selectAll('.highlightRow')
        .filter((d, i) => {
          if (d.index != null) {
            return p.x == d.index;
          }
          return d[i].x == p.x;
        })
        .classed('hovered', true);

      let test = d3.selectAll(".highlightCol") // secondary
        .filter((d, i) => {
          if (d.index != null) {
            return p.x == d.index;
          }
          return d[i].x == p.x;
        })
        .classed("hovered", true);





      */
      // Highlight attribute rows on hovered edge
      /* Highlight row and column labels
      d3.selectAll(".row text").classed("active", (d, i) => {
        if(d[i] == null){
          return false;
        }
        return d[i].screen_name == p.rowid;
      });

      d3.selectAll(".column text").classed("active", (d, i) => {
        return d[i].screen_name == p.colid;
      });*/




      // determine the updated

      /*d3.selectAll('.highlightRow')
        .filter((d: any, i) => { return d.y === rowIndex || d.y == colIndex })
        .classed('hovered', true)

        that.tooltip.transition().duration(200).style("opacity", .9);

        let matrix = this.getScreenCTM()
          .translate(+this.getAttribute("x"), +this.getAttribute("y"));

        that.tooltip.transition()
          .duration(200)
          .style("opacity", .9);

        that.tooltip.html("DATA")
          .style("left", (window.pageXOffset + matrix.e - 20) + "px")
          .style("top", (window.pageYOffset + matrix.f - 20) + "px");*/
    }

    function mouseoutCell() {
      d3.selectAll("text").classed("active", false);

      that.tooltip.transition().duration(250).style("opacity", 0);

      // encapsulate in one function
      d3.selectAll('.attrRow')
        .classed('hovered', false);
      d3.selectAll('.topoRow')
        .classed('hovered', false);
      d3.selectAll('.highlightCol')
        .classed('hovered', false);
    }

    this.order = this.controller.getOrder();

    let labelSize = this.controller.configuration.nodeAttributes.length > 4 ? 9.5 : 11;
    console.log(labelSize);
    this.edgeRows.append("text")
      .attr('class', 'rowLabel')
      .attr("id", (d, i) => {
        return "rowLabel" + d[i].rowid;
      })
      .attr('z-index', 30)
      .attr("x", 0)
      .attr("y", this.orderingScale.bandwidth() / 2)
      .attr("dy", ".32em")
      .attr("text-anchor", "end")
      .style("font-size", labelSize)
      .text((d, i) => this.nodes[i].shortName)
      .on("mouseout", (d, i, nodes) => {
        //let func = this.removeHighlightNodesToDict;

        let rowID = d[0].rowid;

        that.removeHighlightNodesToDict(this.controller.hoverRow, rowID, rowID);  // Add row (rowid)
        that.removeHighlightNodesToDict(this.controller.hoverCol, rowID, rowID);  // Add row (rowid)

        //that.addHighlightNodesToDict(this.controller.hoverCol, cell.colid, cellID);  // Add col (colid)
        d3.selectAll('.hovered').classed('hovered', false);
        that.renderHighlightNodesFromDict(this.controller.hoverRow, 'hovered', 'Row');
        that.renderHighlightNodesFromDict(this.controller.hoverCol, 'hovered', 'Row');

      })
      .on('mouseover', (d, i, nodes) => {
        let rowID = d[0].rowid;

        that.addHighlightNodesToDict(this.controller.hoverRow, rowID, rowID);  // Add row (rowid)
        that.addHighlightNodesToDict(this.controller.hoverCol, rowID, rowID);  // Add row (rowid)

        this.mouseoverEvents.push({ time: new Date().getTime(), event: 'rowLabel' + rowID })

        d3.selectAll('.hovered').classed('hovered', false);
        that.renderHighlightNodesFromDict(this.controller.hoverRow, 'hovered', 'Row');
        that.renderHighlightNodesFromDict(this.controller.hoverCol, 'hovered', 'Col');

      })
      .on('click', (d, i, nodes) => {
        //d3.select(nodes[i]).classed('clicked',!d3.select(nodes[i]).classed('clicked'))
        this.clickFunction(d, i, nodes);
      })


    this.edgeColumns.append("text")
      .attr("id", (d, i) => {
        return "colLabel" + d[i].rowid;
      })
      .attr('class', 'colLabel')
      .attr('z-index', 30)
      .attr("y", 3)
      .attr('x', 2)
      .attr("dy", ".32em")
      .attr("text-anchor", "start")
      .style("font-size", labelSize)
      .text((d, i) => this.nodes[i].shortName)
      .on('click', (d, i, nodes) => {
        if (this.controller.configuration.adjMatrix.neighborSelect) {
          this.clickFunction(d, i, nodes);
          let action = this.controller.view.changeInteractionWrapper(null, nodes[i], 'neighborSelect');
          this.controller.model.provenance.applyAction(action);


        } else {
          this.clickFunction(d, i, nodes);
        }
        //d3.select(nodes[i]).classed('clicked',!d3.select(nodes[i]).classed('clicked'))
      })
      .on("mouseout", (d, i, nodes) => {
        //let func = this.removeHighlightNodesToDict;

        let colID = d[0].rowid; // as rows and columns are flipped

        that.removeHighlightNodesToDict(this.controller.hoverCol, colID, colID);  // Add row (rowid)
        that.removeHighlightNodesToDict(this.controller.hoverRow, colID, colID);  // Add row (rowid)

        //that.addHighlightNodesToDict(this.controller.hoverCol, cell.colid, cellID);  // Add col (colid)
        d3.selectAll('.hovered').classed('hovered', false);
        that.renderHighlightNodesFromDict(this.controller.hoverCol, 'hovered', 'Col');
        that.renderHighlightNodesFromDict(this.controller.hoverRow, 'hovered', 'Row');

        //that.renderHighlightNodesFromDict(this.controller.hoverRow,'hovered','Row');
        //that.renderHighlightNodesFromDict(this.controller.hoverCol,'hovered','Col');
      })
      .on('mouseover', (d, i, nodes) => {
        let colID = d[0].rowid;

        that.addHighlightNodesToDict(this.controller.hoverCol, colID, colID);  // Add row (rowid)
        that.addHighlightNodesToDict(this.controller.hoverRow, colID, colID);  // Add row (rowid)

        this.mouseoverEvents.push({ time: new Date().getTime(), event: 'colLabel' + colID })
        //that.addHighlightNodesToDict(this.controller.hoverCol, cell.colid, cellID);  // Add col (colid)
        d3.selectAll('.hovered').classed('hovered', false);
        that.renderHighlightNodesFromDict(this.controller.hoverCol, 'hovered', 'Col');
        that.renderHighlightNodesFromDict(this.controller.hoverRow, 'hovered', 'Row');
      });

    //make rowlabel and collabel


    this.tooltip = d3.select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);

  }

  /**
   * Draws the grid lines for the adjacency matrix.
   * @return none
   */
  drawGridLines() {
    // adds column lines
    this.edgeColumns.append("line")
      .attr("x1", -this.edgeWidth)
      .attr("z-index", 10);
    // append final line to end of topology matrix

    this.edges
      .append("line")
      .attr("x1", this.edgeWidth)
      .attr("x2", this.edgeWidth)
      .attr("y1", 0)
      .attr("y2", this.edgeHeight)
    // append horizontal grid lines
    this.edgeRows.append("line")
      .attr("x2", this.edgeWidth + this.margins.right);
  }

  /**
   * Renders the highlight rows and columns for the adjacency matrix.
   * @return [description]
   */
  drawHighlightElements() {
    // add the highlight rows
    this.edgeColumns
      .append('rect')
      .classed('topoCol', true)
      .attr('id', (d, i) => {
        return "topoCol" + d[i].colid;
      })
      .attr('x', -this.edgeHeight - this.margins.bottom)
      .attr('y', 0)
      .attr('width', this.edgeHeight + this.margins.bottom + this.margins.top) // these are swapped as the columns have a rotation
      .attr('height', this.orderingScale.bandwidth())
      .attr('fill-opacity', 0)
    // added highlight rows
    this.edgeRows
      .append('rect')
      .classed('topoRow', true)
      .attr('id', (d, i) => {
        return "topoRow" + d[i].rowid;
      })
      .attr('x', -this.margins.left)
      .attr('y', 0)
      .attr('width', this.edgeWidth + this.margins.right + this.margins.left)
      .attr('height', this.orderingScale.bandwidth())
      .attr('fill-opacity', 0)
  }


  /**
   * [changeInteractionWrapper description]
   * @param  nodeID ID of the node being changed with
   * @param  node   nodes corresponding to the element class interacted with (from d3 select nodes[i])
   * @param  interactionType class name of element interacted with
   * @return        [description]
   */
  changeInteractionWrapper(nodeID, node, interactionType) {
    return {
      label: interactionType,
      action: (nodeID) => {
        const currentState = this.controller.model.app.currentState();
        console.log(currentState);
        //add time stamp to the state graph
        currentState.time = Date.now();
        currentState.event = interactionType;
        let interactionName = interactionType //cell, search, etc
        let interactedElement = interactionType
        if (interactionName == 'cell') {
          let cellData = d3.select(node).data()[0]; //
          nodeID = cellData.colid;
          interactedElement = cellData.cellName;// + cellData.rowid;

          this.changeInteraction(currentState, nodeID, interactionName + 'col', interactedElement);
          this.changeInteraction(currentState, nodeID, interactionName + 'row', interactedElement);
          if (cellData.cellName != cellData.correspondingCell) {
            interactedElement = cellData.correspondingCell;// + cellData.rowid;
            nodeID = cellData.rowid;

            this.changeInteraction(currentState, nodeID, interactionName + 'col', interactedElement);
            this.changeInteraction(currentState, nodeID, interactionName + 'row', interactedElement);
          }
          return currentState

          //nodeID = cellData.rowid;
          //interactionName = interactionName + 'row'
        } else if (interactionName == 'neighborSelect') {

          //this.controller.model.provenance.applyAction(action);
          let columnData = d3.select(node).data()[0];
          interactedElement = 'colClick' + d3.select(node).data()[0][0].rowid;
          columnData.map(node => {
            if (node.mentions != 0 || node.interacted != 0 || node.retweet != 0) {
              let neighbor = node.colid;
              this.changeInteraction(currentState, neighbor, interactionName, interactedElement);

            }
          })
          return currentState;

        }
        this.changeInteraction(currentState, nodeID, interactionName, interactedElement);
        return currentState;
      },
      args: [nodeID]
    }
  }

  /**
   * Used to determine the ID based upon the datum element.
   * @param  data data returned as the first argument of d3 selection
   * @return      a list containing the id (ID's) of data elements
   */
  determineID(data) {
    // if attr Row
    if (data[this.datumID]) {
      return data[this.datumID]
    } else if (data.colid) { // if cell
      return data.colid + data.rowid;
    } else { // if colLabel or rowLabel
      return data[0].rowid;
    }
  }
  alreadyCellInState(state, nodeID) {
    let cellNames = splitCellNames(nodeID);
    let flag = false;
    cellNames.map(name => {
      if (state.selections['cell'][name]) {
        delete state.selections['cell'][name]
        flag = true;
      }
    })
    return flag;
  }
  /**
   * Adds the interacted node to the state object.
   * @param  state           [description]
   * @param  nodeID          [description]
   * @param  interaction     [description]
   * @param  interactionName [description]
   * @return                 [description]
   */
  changeInteraction(state, nodeID: string, interaction: string, interactionName: string = interaction) {

    // if there have been any mouseover events since the last submitted action, log them in provenance
    if (this.mouseoverEvents.length > 1) {
      state.selections.previousMouseovers = this.mouseoverEvents;
      this.mouseoverEvents = [];
    }


    if (nodeID in state.selections[interaction]) {
      // Remove element if in list, if list is empty, delete key
      let currentIndex = state.selections[interaction][nodeID].indexOf(interactionName);
      if (currentIndex > -1) {
        state.selections[interaction][nodeID].splice(currentIndex, 1);
        if (state.selections[interaction][nodeID].length == 0) delete state.selections[interaction][nodeID];
      } else {
        state.selections[interaction][nodeID].push(interactionName);
      }
    } else {
      state.selections[interaction][nodeID] = [interactionName];
    }
  }



  /**
   * [mouseoverEdge description]
   * @return [description]
   */
  mouseoverEdge() {

  }
  linspace(startValue, stopValue, cardinality) {
    var arr = [];
    var step = (stopValue - startValue) / (cardinality - 1);
    for (var i = 0; i < cardinality; i++) {
      arr.push(startValue + (step * i));
    }
    return arr;
  }

  setSquareColors(type) {
    let squares = d3.selectAll('.cell').selectAll('rect')
      .transition()
      .duration(500);


    if (type == 'all') {
      squares
        .style("fill", (d: any) => {
          if (d.interacted !== 0) {
            return this.edgeScales["interacted"](d.interacted);
          } else if (d.retweet !== 0) {
            return this.edgeScales["retweet"](d.retweet);
          } else if (d.mentions !== 0) {
            return this.edgeScales["mentions"](d.mentions);
          } else if (d.z > 3) {
            return "pink";
          }
        })
        .filter(d => { return d.interacted !== 0 || d.retweet !== 0 || d.mentions !== 0)
        .style("fill-opacity", (d) => {
          return (d.interacted !== 0 || d.retweet !== 0 || d.mentions !== 0) ? 1 : 0;
        });
    } else if (type == "interacted") {
      squares.style("fill", (d: any) => {
        if (d.interacted !== 0) {
          return this.edgeScales["interacted"](d.interacted);
        } else {
          return "white";
        }
      })
        .style("fill-opacity", (d) => {
          return d.interacted !== 0 ? 1 : 0;
        });


    } else if (type == "retweet") {
      squares.style("fill", (d: any) => {
        if (d.retweet !== 0) {
          return this.edgeScales["retweet"](d.retweet);
        } else {
          return "white";
        }
      })
        .style("fill-opacity", (d) => {
          return d.retweet !== 0 ? 1 : 0;
        });
    } else if (type == "mentions") {
      squares.style("fill", (d: any) => {
        if (d.mentions !== 0) {
          return this.edgeScales["mentions"](d.mentions);
        } else {
          return "white";
        }
      })
        .style("fill-opacity", (d) => {
          return d.mentions !== 0 ? 1 : 0;
        });
    }
  }

  generateScaleLegend(type, numberOfEdge) {
    let yOffset = 10;
    let xOffset = 10;

    if (this.controller.configuration.adjMatrix.edgeBars && this.controller.configuration.isMultiEdge) {
      let legendFile = 'assets/adj-matrix/';
      legendFile += this.controller.configuration.isMultiEdge ? 'nestedSquaresLegend' : 'edgeBarsLegendSingleEdge'
      legendFile += '.png';
      d3.select('#legend-svg').append('g').append("svg:image")
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 90)
        .attr('height', 120)
        .attr("xlink:href", legendFile)
      //return;
      xOffset = 100;
    }

    let rectWidth = 18;
    let rectHeight = 10;
    let legendWidth = 175;
    let legendHeight = 60;
    yOffset += legendHeight * numberOfEdge;

    let scale = this.edgeScales[type];
    let extent = scale.domain();
    let number = 5

    let sampleNumbers = [0, 1, 3, 5]//this.linspace(extent[0], extent[1], number);

    let svg = d3.select('#legend-svg').append("g")
      .attr("id", "legendLinear" + type)
      .attr("transform", (d, i) => "translate(" + xOffset + "," + yOffset + ")")
      .on('click', (d, i, nodes) => {
        if (this.controller.configuration.adjMatrix.selectEdgeType == true) { //
          let edgeType = this.controller.configuration.state.adjMatrix.selectedEdgeType == type ? 'all' : type;
          this.controller.configuration.state.adjMatrix.selectedEdgeType = edgeType;
          this.setSquareColors(edgeType);
          if (edgeType == "all") {
            d3.selectAll('.selectedEdgeType').classed('selectedEdgeType', false);
          } else {
            d3.selectAll('.selectedEdgeType').classed('selectedEdgeType', false);
            d3.selectAll('#legendLinear' + type).select('.edgeLegendBorder').classed('selectedEdgeType', true)

          }
        }
      });
    let boxWidth = (number + 1) * rectWidth + 15

    svg.append('rect')
      .classed('edgeLegendBorder', true)
      .attr('stroke', 'gray')
      .attr('stroke-width', 1)
      .attr('width', boxWidth)
      .attr('height', 55)
      .attr('fill-opacity', 0)
      .attr('x', 0)
      .attr('y', -9)
      .attr('ry', 2)
      .attr('rx', 2)

    let pluralType = type;

    if (pluralType == "retweet") {
      pluralType = "retweets";
    } else if (pluralType == "interacted") {
      pluralType = "interactions";
    }

    svg.append('text')
      .attr('x', boxWidth / 2)
      .attr('y', 8)
      .attr('text-anchor', 'middle')
      .text("# of " + pluralType)
    let sideMargin = ((boxWidth) - (sampleNumbers.length * (rectWidth + 5))) / 2

    let groups = svg.selectAll('g')
      .data(sampleNumbers)
      .enter()
      .append('g')
      .attr('transform', (d, i) => 'translate(' + (sideMargin + i * (rectWidth + 5)) + ',' + 15 + ')')

    groups
      .append('rect')
      .attr('width', rectWidth)
      .attr('height', rectHeight)
      .attr('fill', (d) => {
        return scale(d);
      })
      .attr('stroke', (d) => {
        return d == 0 ? '#bbb' : 'white';
      })

    groups
      .append('text')
      .attr('x', rectWidth / 2)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .text(d => {
        return Math.round(d);
      })




  }

  generateColorLegend() {
    let counter = 0;
    for (let type in this.edgeScales) {
      if (this.controller.configuration.isMultiEdge) {
        if (type == "interacted") {
          continue;
        }
        this.generateScaleLegend(type, counter)
        counter += 1;

      } else {
        if (type != "interacted") {
          continue;
        }
        this.generateScaleLegend(type, counter)
      }
    }
  }

  /**
   * [selectRow description]
   * @param  node [description]
   * @return      [description]
   */
  classHighlights(nodeID, rowOrCol: string = 'Row', className: string) {
    // select attr and topo highlight
    d3.selectAll('Attr' + rowOrCol + nodeID + ',' + 'Topo' + rowOrCol + nodeID)
      .classed(className, true);
    //d3.selectAll('#highlight' + 'Topo' + rowOrCol + nodeID)
    //  .classed(className, true);*

    // highlight row text
    //d3.selectAll('')rowOrCol
    // else highlight column text

  }








  /**
   * [highlightRow description]
   * @param  node [description]
   * @return      [description]
   */
  /*highlightRow(node) {
    let nodeID = node[this.datumID];
    if (nodeID == null) {
      nodeID = node.rowid;
    }
    // highlight attr
    this.highlightNode(nodeID, 'attr');
    this.highlightNode(nodeID, 'topo');
  }

  highlightRowAndCol(node) {
    let nodeID = node.screen_name;
    if (node.screen_name == null) {
      nodeID = node.colid;
    }

    this.highlightNode(nodeID, 'attr');
    this.highlightNode(nodeID, '', 'Col');
  }

  highlightNode(nodeID: string, attrOrTopo: string, rowOrCol: string = 'Row') {
    d3.selectAll('.' + attrOrTopo + rowOrCol + nodeID)
      .classed('hovered', true);
  }*/



  //u: BCC    BCCINVITADOS2019
  //p:

  //private selectedNodes : any;
  // DOESNT GET ADDED
  addHighlightNode(addingNode: string) {
    // if node is in
    let nodeIndex = this.nodes.findIndex(function(item, i) {
      return item[this.datumID] == addingNode;
    });
    for (let i = 0; i < this.matrix[0].length; i++) {
      if (this.matrix[i][nodeIndex].z > 0) {
        let nodeID = this.matrix[i][nodeIndex].rowid;
        if (this.controller.configuration.state.adjMatrix.highlightedNodes.hasOwnProperty(nodeID) && !this.controller.configuration.state.adjMatrix.highlightedNodes[nodeID].includes(addingNode)) {
          // if array exists, add it
          this.controller.configuration.state.adjMatrix.highlightedNodes[nodeID].push(addingNode);
        } else {
          // if array non exist, create it and add node
          this.controller.configuration.state.adjMatrix.highlightedNodes[nodeID] = [addingNode];
        }
      }
    }
  }







  /**
   * [removeHighlightNode description]
   * @param  nodeID       [description]
   * @param  removingNode [description]
   * @return              [description]

  removeHighlightNode(removingNode: string) {
    // remove from selected nodes

    for (let nodeID in this.controller.configuration.state.adjMatrix.highlightedNodes) {
      //finds the position of removing node in the nodes array
      let index = this.controller.configuration.state.adjMatrix.highlightedNodes[nodeID].indexOf(removingNode);
      // keep on removing all places of removing node
      if (index > -1) {
        this.controller.configuration.state.adjMatrix.highlightedNodes[nodeID].splice(index, 1);
        // delete properties if no nodes left
        if (this.controller.configuration.state.adjMatrix.highlightedNodes[nodeID].length == 0) {
          delete this.controller.configuration.state.adjMatrix.highlightedNodes[nodeID];
        }
      }
    }
  }*/

  nodeDictContainsPair(dict, nodeToHighlight, interactedElement) {
    if (nodeToHighlight in dict) {
      return dict[nodeToHighlight].has(interactedElement)
    }
    return false;
  }

  /**
   * If an interactedElement has not been interacted with, it will add the nodeToHighlight
   * to the provided highlight dict. If it has, it will remove it and return false. Otherwise,
   * it will add the interacted element connection to the nodeToHighlight.
   * @param  dict       The underlying storage to show which
   * @param  nodeToHighlight  [description]
   * @param  interactedElement [description]
   * @return            [description]
   */
  addHighlightNodesToDict(dict, nodeToHighlight, interactedElement) {
    // if node already in highlight, remove it
    if (this.nodeDictContainsPair(dict, nodeToHighlight, interactedElement)) {
      this.removeHighlightNodesToDict(dict, nodeToHighlight, interactedElement)
      return false;
    }

    // create new set if set exists
    if (!(nodeToHighlight in dict)) {

      dict[nodeToHighlight] = new Set();
    }
    // add element to set
    dict[nodeToHighlight].add(interactedElement);
    return true;
  }

  removeHighlightNodesToDict(dict, nodeToHighlight, interactedElement) {
    // if node is not in list, simply return
    if (!this.nodeDictContainsPair(dict, nodeToHighlight, interactedElement)) {
      return;
    }

    // if there are other elements highlighting the node to highlight
    if (dict[nodeToHighlight].size > 1) { // if set has more than 1 object
      dict[nodeToHighlight].delete(interactedElement); // delete element from set
    }
    else {
      delete dict[nodeToHighlight];
    }
  }

  renderHighlightNodesFromDict(dict, classToRender, rowOrCol: string = 'Row') {

    //unhighlight all other nodes

    //highlight correct nodes
    let cssSelector = '';
    for (let nodeID in dict) {
      if (rowOrCol == 'Row') {
        cssSelector += '#attr' + rowOrCol + nodeID + ',';
      }
      cssSelector += '#topo' + rowOrCol + nodeID + ','

      if (classToRender == 'answer' && rowOrCol == "Row") {
        cssSelector += '#nodeLabelRow' + nodeID + ','
      }

    }
    // remove last comma
    cssSelector = cssSelector.substring(0, cssSelector.length - 1);
    if (cssSelector == '') {
      return;
    }
    d3.selectAll(cssSelector).classed(classToRender, true);

  }



  selectNode(nodeID: string) {
    let index = this.controller.configuration.state.selectedNodes.indexOf(nodeID)

    if (index > -1) {
      this.controller.configuration.state.selectedNodes.splice(index, 1);
    } else {
      this.controller.configuration.state.selectedNodes.push(nodeID);
    }

    let attrRow = d3.selectAll('attr' + 'Row' + nodeID);
    attrRow
      .classed('selected', !attrRow.classed('selected'));

    let topoRow = d3.selectAll('topo' + 'Row' + nodeID);
    topoRow
      .classed('selected', !topoRow.classed('selected'));
  }

  selectColumnNode(nodeID) {
    // highlight
  }

  /**
   * Old implementation to select the neighboring nodes.
   * @param  nodeID [description]
   * @return        [description]
   */
  selectNeighborNodes(nodeID) {
    let nodeIndex = this.controller.configuration.state.adjMatrix.columnSelectedNodes.indexOf(nodeID);
    if (nodeIndex > -1) {
      // find all neighbors and remove them
      this.controller.configuration.state.adjMatrix.columnSelectedNodes.splice(nodeIndex, 1)
      this.removeHighlightNode(nodeID);
      this.controller.configuration.state.adjMatrix.columnSelectedNodes.splice(nodeIndex, 1);
      // remove node from column selected nodes
    } else {
      this.addHighlightNode(nodeID);
      this.controller.configuration.state.adjMatrix.columnSelectedNodes.push(nodeID);
    }
    this.renderNeighborHighlightNodes();
    /*let index = this.controller.configuration.state.selectedNodes.indexOf(nodeID);

    if(index > -1){ // if in selected node, remove it (unless it is )
      this.controller.configuration.state.selectedNodes.splice(index,1);
      //find all partner nodes
      // if still exists keep,
    } else {
      // add node
      this.controller.configuration.state.selectedNodes.push(nodeID);

    }

    let attrRow = d3.selectAll('#highlight'+'Attr'+'Row'+nodeID);
    attrRow
      .classed('selected',(d)=>{
        // need to remove if clicked, but not if clicked from another node
        // store hashmap with counts
        // iterate through each time a click and change values
        // if lengths > 0

        // Add all elements to set
        // at each click, readd and remove all

        // if already selected, remove  and uncolor nodes
        // if not, add and color nodes



        return !
      });//!attrRow.classed('selected')


    let topoRow = d3.selectAll('#highlight'+'Topo'+'Row'+nodeID);
    topoRow
        .classed('selected',!topoRow.classed('selected'));


        */
  }




  private attributeRows: any;
  private tooltip: any;
  private barWidthScale: any;
  private columnScale: any;
  private order: any;

  /**
   * [sort description]
   * @return [description]
   */
  sort(order) {
    this.order = this.controller.changeOrder(order);
    this.orderingScale.domain(this.order);

    let transitionTime = 500;
    d3.selectAll(".row")
      //.transition()
      //.duration(transitionTime)
      //.delay((d, i) => { return this.orderingScale(i) * 4; })
      .attr("transform", (d, i) => {
        if (i > this.order.length - 1) return;
        return "translate(0," + this.orderingScale(i) + ")";
      })

    let cells = d3.selectAll(".cell")//.selectAll('rect')
      //.transition()
      //.duration(transitionTime)
      //.delay((d, i) => { return this.orderingScale(i) * 4; })
      //.delay((d) => { return this.orderingScale(d.x) * 4; })
      .attr("transform", (d, i) => {
        return 'translate(' + this.orderingScale(d.x) + ',0)'
      });

    this.attributeRows
      //.transition()
      //.duration(transitionTime)
      //.delay((d, i) => { return this.orderingScale(i) * 4; })
      .attr("transform", (d, i) => { return "translate(0," + this.orderingScale(i) + ")"; })

    // update each highlightRowsIndex




    var t = this.edges//.transition().duration(transitionTime);
    t.selectAll(".column")
      //.delay((d, i) => { return this.orderingScale(i) * 4; })
      .attr("transform", (d, i) => { return "translate(" + this.orderingScale(i) + ",0)rotate(-90)"; });

    /*d3.selectAll('.highlightRow') // taken care of as they're apart of row and column groupings already
      .transition()
      .duration(transitionTime)
      .delay((d, i) => { return this.orderingScale(i) * 4; })
      .attr("transform", (d, i) => { return "translate(0," + this.orderingScale(i) + ")"; })

    d3.selectAll('.highlightCol')
      .transition()
      .duration(transitionTime)
      .delay((d, i) => { return this.orderingScale(i) * 4; })
      .attr("transform", (d, i) => { return "translate(" + this.orderingScale(i) + ")rotate(-90)"; });*/

    // change glyph coloring for sort
    d3.selectAll('.glyph').attr('fill','#8B8B8B');
    // for quantitative values, change their color
    if(this.controller.view.columnGlyphs[order]){
      this.controller.view.columnGlyphs[order].attr('fill','#EBB769');
    }

  }

  updateCheckBox(state) {
    if (this.controller.configuration.attributeScales.node.selected == undefined) {
      return;
    }
    let color = this.controller.configuration.attributeScales.node.selected.range[0];

    d3.selectAll('.answerBox').selectAll('rect').transition().duration(250)
      .style("fill", d => {
        let answerStatus = d[this.datumID] in state.selections.answerBox;
        return answerStatus ? color : "white"
      })
  }
  updateAnswerToggles(state) {
    //let answerStatus = nodeID in this.controller.answerRow;
    if (this.controller.configuration.attributeScales.node.selected == undefined) {
      return;
    }
    let color = this.controller.configuration.attributeScales.node.selected.range[0];
    d3.selectAll('.answerBox').selectAll('circle').transition().duration(500)
      .attr("cx", d => {
        let answerStatus = d[this.datumID] in state.selections.answerBox;
        return (answerStatus ? 3 * this.columnWidths['selected'] / 4 : 1.15 * this.columnWidths['selected'] / 4)
      })
      .style("fill", d => {
        let answerStatus = d[this.datumID] in state.selections.answerBox;
        return answerStatus ? color : "white";
      })


    d3.select('.answerBox').selectAll('rect').transition().duration(500)
      .style("fill", d => {
        let answerStatus = d[this.datumID] in state.selections.answerBox;
        return answerStatus ? "#8B8B8B" : "lightgray"
      })
  }

  private columnscreen_names: {};
  private attributeScales: any;
  private columnWidths: any;
  /**
   * [initalizeAttributes description]
   * @return [description]
   */
  initalizeAttributes() {



    let width = this.controller.visWidth * this.controller.attributePorportion;//this.edgeWidth + this.margins.left + this.margins.right;
    let height = this.controller.visHeight;//this.edgeHeight + this.margins.top + this.margins.bottom;
    this.attributeWidth = width - (this.margins.left + this.margins.right) //* this.controller.attributePorportion;
    this.attributeHeight = height - (this.margins.top + this.margins.bottom)// * this.controller.attributePorportion;

    this.attributes = d3.select('#attributes').append("svg")
      .attr("viewBox", "0 0 " + (width) + " " + height + "")
      .attr("preserveAspectRatio", "xMinYMin meet")
      .append("g")
      .classed("svg-content", true)
      .attr('id', 'attributeMargin')
      .attr("transform", "translate(" + 0 + "," + this.margins.top + ")");


    // add zebras and highlight rows
    /*
    this.attributes.selectAll('.highlightRow')
      .data(this.nodes)
      .enter()
      .append('rect')
      .classed('highlightRow', true)
      .attr('x', 0)
      .attr('y', (d, i) => this.orderingScale(i))
      .attr('width', this.attributeWidth)
      .attr('height', this.orderingScale.bandwidth())
      .attr('fill', (d, i) => { return i % 2 == 0 ? "#fff" : "#eee" })
      */

    let barMargin = { top: 1, bottom: 1, left: 5, right: 5 }
    let barHeight = this.orderingScale.bandwidth() - barMargin.top - barMargin.bottom;

    // Draw each row (translating the y coordinate)
    this.attributeRows = this.attributes.selectAll(".row")
      .data(this.nodes)
      .enter().append("g")
      .attr("class", "row")
      .attr("transform", (d, i) => {
        return "translate(0," + this.orderingScale(i) + ")";
      });



    this.attributeRows.append("line")
      .attr("x1", 0)
      .attr("x2", this.controller.attrWidth)
      .attr('stroke', '2px')
      .attr('stroke-opacity', 0.3);

    let attributeMouseOver = (d) => {
      that.addHighlightNodesToDict(this.controller.hoverRow, d[this.datumID], d[this.datumID]);  // Add row (rowid)
      that.addHighlightNodesToDict(this.controller.hoverCol, d[this.datumID], d[this.datumID]);  // Add row (rowid)

      this.mouseoverEvents.push({ time: new Date().getTime(), event: 'attrRow' + d[this.datumID] })

      d3.selectAll('.hovered').classed('hovered', false);
      that.renderHighlightNodesFromDict(this.controller.hoverRow, 'hovered', 'Row');
      that.renderHighlightNodesFromDict(this.controller.hoverCol, 'hovered', 'Col');
    };
    this.attributeMouseOver = attributeMouseOver;
    let attributeMouseOut = (d) => {

      that.removeHighlightNodesToDict(this.controller.hoverRow, d[this.datumID], d[this.datumID]);  // Add row (rowid)
      that.removeHighlightNodesToDict(this.controller.hoverCol, d[this.datumID], d[this.datumID]);  // Add row (rowid)

      d3.selectAll('.hovered').classed('hovered', false);

      that.renderHighlightNodesFromDict(this.controller.hoverRow, 'hovered', 'Row');

    };
    this.attributeMouseOut = attributeMouseOut;

    this.attributeRows.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .classed('attrRow', true)
      .attr('id', (d, i) => {
        return "attrRow" + d[this.datumID];
      })
      .attr('width', width)
      .attr('height', this.orderingScale.bandwidth()) // end addition
      .attr("fill-opacity", 0)
      .on('mouseover', attributeMouseOver)
      .on('mouseout', attributeMouseOut).on('click', this.clickFunction);


    /*.on('click', (d, i, nodes) => {

      /*let cellElement = d3.select(nodes[index]).selectAll('rect');
      cellElement.classed('clickedCell', !cellElement.classed('clickedCell'))
      let cellID = cell.rowid + cell.colid;
      let nodeID = d.screen_name;
      /*
      // will add or remove node
      that.addHighlightNodesToDict(this.controller.answerRow, nodeID, nodeID);  // Add row (rowid)
      d3.selectAll('.answer').classed('answer', nodeID in this.controller.answerRow);
      that.renderHighlightNodesFromDict(this.controller.answerRow, 'answer', 'Row');


      that.addHighlightNodesToDict(this.controller.clickedRow, nodeID, nodeID);  // FOR ANSWER
      //d3.selectAll('.answer').classed('answer', false);
      d3.selectAll('.clicked').classed('clicked', nodeID in this.controller.clickedRow);

      that.renderHighlightNodesFromDict(this.controller.clickedCol, 'clicked', 'Col');
      that.renderHighlightNodesFromDict(this.controller.clickedRow, 'clicked', 'Row');

      // classes row
      //this.classHighlights(d.screen_name, 'Row', 'answer');
      //this.selectNode(d[0].rowid);
    });*/


    let columns = this.controller.configuration.nodeAttributes;

    //columns.unshift('selected'); // ANSWER COLUMNS

    var formatCurrency = d3.format("$,.0f"),
      formatNumber = d3.format(",.0f");

    // generate scales for each
    let attributeScales = {};
    this.columnScale = d3.scaleOrdinal().domain(columns)

    // Calculate Column Scale
    let columnRange = []
    let xRange = 0;


    let columnWidths = this.determineColumnWidths(columns); // ANSWER COLUMNS
    //450 / columns.length;
    this.columnWidths = columnWidths;

    let categoricalAttributes = ["type", "continent"]
    let quantitativeAttributes = ["followers_count", "friends_count", "statuses_count", "count_followers_in_query", "favourites_count", "listed_count", "memberFor_days", "query_tweet_count"]

    columns.forEach((col, index) => {
      // calculate range
      columnRange.push(xRange);
      let domain = this.controller.configuration.attributeScales.node[col].domain;

      if (quantitativeAttributes.indexOf(col) > -1) {

        let scale = d3.scaleLinear().domain(domain).range([barMargin.left, columnWidths[col] - barMargin.right]);
        scale.clamp(true);
        attributeScales[col] = scale;
      } else {
        // append colored blocks
        // placeholder scale
        let range = this.controller.configuration.attributeScales.node[col].range;
        let scale = d3.scaleOrdinal().domain(domain).range(range);
        //.domain([true,false]).range([barMargin.left, colWidth-barMargin.right]);

        attributeScales[col] = scale;
      }

      xRange += columnWidths[col];
    })
    this.attributeScales = attributeScales;


    // need max and min of each column
    /*this.barWidthScale = d3.scaleLinear()
      .domain([0, 1400])
      .range([0, 140]);*/





    let placementScale = {};

    this.columnScale.range(columnRange);

    for (let [column, scale] of Object.entries(attributeScales)) {
      if (categoricalAttributes.indexOf(column) > -1) { // if not selected categorical
        placementScale[column] = this.generateCategoricalLegend(column, columnWidths[column]);

      } else if (quantitativeAttributes.indexOf(column) > -1) {
        this.attributes.append("g")
          .attr("class", "attr-axis")
          .attr("transform", "translate(" + this.columnScale(column) + "," + -15 + ")")
          .call(d3.axisTop(scale)
            .tickValues(scale.domain())
            .tickFormat((d) => {
              if ((d / 1000) >= 1) {
                d = Math.round(d / 1000) + "K";
              }
              return d;
            }))
          .selectAll('text')
          .style("text-anchor", function(d, i) { return i % 2 ? "end" : "start" });
      }


    }

    this.columnGlyphs = {};

    /* Create data columns data */
    columns.forEach((column, index) => {
      let columnPosition = this.columnScale(column);

      if (categoricalAttributes.indexOf(column) > -1) { // if categorical
        this.createUpsetPlot(column, columnWidths[index], placementScale[column]);
        return;
      } else if (quantitativeAttributes.indexOf(column) > -1) { // if quantitative
        this.columnGlyphs[column] = this.attributeRows
          .append("rect")
          .attr("class", "glyph "+column)
          .attr('height', barHeight)
          .attr('width', 10) // width changed later on transition
          .attr('x', columnPosition + barMargin.left)
          .attr('y', barMargin.top) // as y is set by translate
          .attr('fill', d=>{
            console.log(this.controller.model.orderType,column);
            return this.controller.model.orderType == column ? '#EBB769':'#8B8B8B'
          })
          .on('mouseover', function(d) {
            //if (that.columnNames[d] && that.columnNames[d].length > maxcharacters) {
            //that.tooltip.transition().delay(1000).duration(200).style("opacity", .9);

            let matrix = this.getScreenCTM()
              .translate(+this.getAttribute("x"), +this.getAttribute("y"));

            that.tooltip.html(Math.round(d[column]))
              .style("left", (window.pageXOffset + matrix.e + columnWidths[column] / 2 - 35) + "px")
              .style("top", (window.pageYOffset + matrix.f - 5) + "px");

            that.tooltip.transition()
              .duration(200)
              .style("opacity", .9);

            attributeMouseOver(d);
            //}
          })
          .on('mouseout', (d) => {
            that.tooltip.transition().duration(25).style("opacity", 0);
            attributeMouseOut(d);
          })
        this.columnGlyphs[column]
          .transition()
          .duration(2000)
          .attr('width', (d, i) => { return attributeScales[column](d[column]); })


        this.attributeRows
          .append("div")
          .attr("class", "glyphLabel")
          .text(function(d, i) {
            return (d);
          });
      } else {
        barMargin.left = 1;
        let answerBox = this.attributeRows
          .append('g')
          .attr("class", "answerBox")
          .attr("id", d => "answerBox" + d[this.datumID])
          .attr('transform', 'translate(' + (columnPosition + barMargin.left) + ',' + 0 + ')');
        if (this.controller.configuration.adjMatrix.toggle) {
          let rect = answerBox.append("rect")
            .attr("x", (columnWidths[column] / 4)) // if column with is 1, we want this at 1/4, and 1/2 being mid point
            .attr("y", barMargin.top)
            .attr("rx", barHeight / 2)
            .attr("ry", barHeight / 2)
            .style("fill", "lightgray")
            .attr("width", columnWidths[column] / 2)
            .attr("height", barHeight)
            .attr('stroke', 'lightgray')
            .on('mouseover', attributeMouseOver)
            .on('mouseout', attributeMouseOut);

          let circle = answerBox.append("circle")
            .attr("cx", (1.15 * columnWidths[column] / 4))
            .attr("cy", barHeight / 2 + barMargin.top)
            .attr("r", barHeight / 2)
            .style("fill", "white")
            .style('stroke', 'lightgray');
        } else {
          let rect = answerBox.append("rect")
            .attr("x", (columnWidths[column] / 2) - barHeight / 2) // if column with is 1, we want this at 1/4, and 1/2 being mid point
            .attr("y", barMargin.top)
            //.attr("rx", barHeight / 2)
            //.attr("ry", barHeight / 2)
            .style("fill", "white")
            .attr("width", barHeight)
            .attr("height", barHeight)
            .attr('stroke', 'lightgray')
            .on('mouseover', attributeMouseOver)
            .on('mouseout', attributeMouseOut);
        }


        answerBox
          .on('click', (d, i, nodes) => {
            let color = this.controller.configuration.attributeScales.node.selected.range[0];
            //if already answer
            let nodeID = this.determineID(d);

            //that.addHighlightNodesToDict(this.controller.answerRow, nodeID, nodeID);  // Add row or remove if already in
            //d3.selectAll('.answer').classed('answer', false);
            //that.renderHighlightNodesFromDict(this.controller.answerRow, 'answer', 'Row');

            /*Visual chagne */
            let answerStatus = nodeID in this.controller.answerRow;
            if (this.controller.configuration.adjMatrix.toggle) {
              d3.select(nodes[i]).selectAll('circle').transition().duration(500)
                .attr("cx", (answerStatus ? 3 * columnWidths[column] / 4 : 1.15 * columnWidths[column] / 4))
                .style("fill", answerStatus ? color : "white");
              d3.select(nodes[i]).selectAll('rect').transition().duration(500)
                .style("fill", answerStatus ? "#8B8B8B" : "lightgray");
            } else {

            }


            this.clickFunction(d, i, nodes);

            //let action = this.changeInteractionWrapper(nodeID, i, nodes);
            //this.controller.model.provenance.applyAction(action);



            //d3.select(nodes[i]).transition().duration(500).attr('fill',)
          })

      }
    });

    // Add Verticle Dividers
    this.attributes.selectAll('.column')
      .data(columns)
      .enter()
      .append('line')
      .style('stroke', '1px')
      .attr('x1', (d) => this.columnScale(d))
      .attr("y1", -20)
      .attr('x2', (d) => this.columnScale(d))
      .attr("y2", this.attributeHeight + this.margins.bottom)
      .attr('stroke-opacity', 0.4);

    // Add headers



    this.columnNames = {
      "followers_count": "Followers",
      "query_tweet_count": "On-Topic Tweets", // not going to be used (how active this person was on the conference)
      "friends_count": "Friends",
      "statuses_count": "Tweets",
      "favourites_count": "Liked Tweets",
      "count_followers_in_query": "In-Network Followers",
      "continent": "Continent",
      "type": "Type",
      "memberFor_days": "Account Age",
      "listed_count": "In Lists",
      "selected": "Answer"
    }
    let that = this;
    function calculateMaxChars(numColumns) {
      switch (numColumns) {
        case 1:
          return { "characters": 20, "font": 17 }
        case 2:
          return { "characters": 20, "font": 15 }
        case 3:
          return { "characters": 20, "font": 14 }
        case 4:
          return { "characters": 19, "font": 13 }
        case 5:
          return { "characters": 18, "font": 12 }
        case 6:
          return { "characters": 16, "font": 12 }
        case 7:
          return { "characters": 14, "font": 10 }
        case 8:
          return { "characters": 12, "font": 10 }
        case 9:
          return { "characters": 10, "font": 10 }
        case 10:
          return { "characters": 8, "font": 10 }
        default:
          return { "characters": 8, "font": 10 }
      }
    }
    let options = calculateMaxChars(columns.length)// 10 attr => 8
    let maxcharacters = options.characters;
    let fontSize = options.font//*1.1;


    //this.createColumnHeaders();
    let columnHeaders = this.attributes.append('g')
      .classed('column-headers', true)
    let columnHeaderGroups = columnHeaders.selectAll('.header')
      .data(columns)
      .enter()
      .append('g')
      .attr('transform', (d) => 'translate(' + (this.columnScale(d)) + ',' + (-65) + ')')

    columnHeaderGroups
      .append('rect')
      .attr('width', d => this.columnWidths[d])
      .attr('height', 20)
      .attr('y', 0)
      .attr('x', 0)
      .attr('fill', 'none')
      .attr('stroke', 'lightgray')
      .attr('stroke-width', 1)

    columnHeaderGroups
      .append('text')
      .classed('header', true)
      //.attr('y', -45)
      //.attr('x', (d) => this.columnScale(d) + barMargin.left)
      .style('font-size', fontSize.toString() + 'px')
      .attr('text-anchor', 'middle')
      //.attr('transform','rotate(-10)')
      .text((d, i) => {
        if (this.columnNames[d] && this.columnNames[d].length > maxcharacters) {
          return this.columnNames[d].slice(0, maxcharacters - 2) + '...';// experimentally determine how big
        }
        return this.columnNames[d];
      })
      .attr('x', d => this.columnWidths[d] / 2)
      .attr('y', 14)
      .on('mouseover', function(d) {
        if (that.columnNames[d] && that.columnNames[d].length > maxcharacters) {
          that.tooltip.transition().duration(200).style("opacity", .9);

          let matrix = this.getScreenCTM()
            .translate(+this.getAttribute("x"), +this.getAttribute("y"));

          that.tooltip.transition()
            .duration(200)
            .style("opacity", .9);

          that.tooltip.html(that.columnNames[d])
            .style("left", (window.pageXOffset + matrix.e - 25) + "px")
            .style("top", (window.pageYOffset + matrix.f - 20) + "px");
        }
      })
      .on('mouseout', function(d) {
        that.tooltip.transition().duration(250).style("opacity", 0);
      })
      .on('click', (d) => {
        if (d !== 'selected') {
          this.sort(d);


        }

      })

    let answerColumn = columnHeaders.selectAll('.header').filter(d => { return d == 'selected' })
    answerColumn.attr('font-weight', 650)

    let nonAnswerColumn = columnHeaders.selectAll('.header').filter(d => { return d !== 'selected' })
    nonAnswerColumn.attr('cursor', 'pointer');

    d3.select('.loading').style('display', 'none');
    this.controller.model.setUpProvenance();
    window.focus();

    // Draw buttons for alternative sorts
    let initalY = -this.margins.left+10;
    let buttonHeight = 15;
    let text = ['name','cluster','interactions'];
    let sortNames = ['shortName','clusterLeaf','edges']
    for(let i = 0; i < 3; i++){
      let button = this.edges.append('g')
        .attr('transform','translate('+(-this.margins.left)+','+(initalY)+')')
      button.attr('cursor','pointer')
      button.append('rect').attr('width',this.margins.left-10).attr('height',buttonHeight).attr('fill','none').attr('stroke','gray').attr('stroke-width',1)
      button.append('text').attr('x',3).attr('y',10).attr('font-size',11).text('Sort:' + text[i]);
      button.on('click',()=>{
        this.sort(sortNames[i]);
      })
      initalY += buttonHeight+5;
    }








    // Append g's for table headers
    // For any data row, add

    /*.on("click", clicked)
    .select(".g-table-column")
    .classed("g-table-column-" + (sortOrder === d3.ascending ? "ascending" : "descending"), function(d) {
      return d === sortKey;
    });*/


  }

  isCategorical(column) {
    return column == "type" || column == "continent" || column == "selected";
  }

  determineColumnWidths(columns) {

    let widths = {};
    // set all column widths to 0
    // set all categorical column width to their width, keep track of total width
    // set all other columns widths based off width - categorical

    let widthOffset = this.controller.attrWidth / columns.length;

    let totalCategoricalWidth = 0;
    let bandwidthScale = 2
    let bandwidth = this.orderingScale.bandwidth();

    // fill in categorical column sizes
    for (let i = 0; i < columns.length; i++) {
      let column = columns[i];
      // if column is categorical
      if (this.isCategorical(column)) {
        let width = (bandwidthScale * bandwidth) * (this.controller.configuration.attributeScales.node[column].domain.length + 3 / bandwidthScale)

        if (column == "selected") {
          width = 60;
        }

        widths[column] = width;
        totalCategoricalWidth += width; // add width
      }
    }

    let quantitativeWidth = this.controller.attrWidth - totalCategoricalWidth,
      quantitativeColumns = columns.length - Object.keys(widths).length,
      quantitativeColumnSize = quantitativeWidth / quantitativeColumns;

    // fill in remaining columns based off the size remaining for quantitative variables
    for (let i = 0; i < columns.length; i++) {
      let column = columns[i];
      if (!(column in widths)) {
        widths[column] = quantitativeColumnSize;
      }
    }
    return widths;


    // add categorical column width
  }



  createUpsetPlot(column, columnWidth, placementScaleForAttr) {
    let columnPosition = this.columnScale(column);
    let topMargin = 1;
    let height = this.orderingScale.bandwidth() - 2 * topMargin;
    let width = this.orderingScale.bandwidth() * 2
    for (let index = 0; index < placementScaleForAttr.length; index++) {
      this.attributeRows
        .append('rect')
        .attr('x', placementScaleForAttr[index].position)
        .attr('y', 1)
        .attr('fill', (d) => {
          return d[column] == placementScaleForAttr[index].value ? this.attributeScales[column](d[column]) : '#dddddd'; // gray version: '#333333'
        })
        .attr('width', width)
        .attr('height', height)
        .on('mouseover', (d, i, nodes) => {
          if (d[column] == placementScaleForAttr[index].value) {
            let matrix = nodes[i].getScreenCTM()
              .translate(+nodes[i].getAttribute("x"), +nodes[i].getAttribute("y"));

            this.tooltip.html(d[column])
              .style("left", (window.pageXOffset + matrix.e - 25) + "px")
              .style("top", (window.pageYOffset + matrix.f - 25) + "px");

            this.tooltip.transition()
              .duration(200)
              .style("opacity", .9);
          }


          this.attributeMouseOver(d);
        })
        .on('mouseout', (d, i, nodes) => {
          this.tooltip.transition()
            .duration(25)
            .style("opacity", 0);
          //that.tooltip.transition().duration(25).style("opacity", 0);

          this.attributeMouseOut(d);
        });
    }


    return;
  }

  generateCategoricalLegend(attribute, legendWidth) {
    let attributeInfo = this.controller.configuration.attributeScales.node[attribute];
    let dividers = attributeInfo.domain.length;
    let legendHeight = 25;
    let bandwidthScale = 2
    let bandwidth = this.orderingScale.bandwidth();

    let legendItemSize = bandwidth * bandwidthScale;
    //(legendWidth) / (dividers + 3/bandwidthScale);
    let margin = bandwidth * bandwidthScale / dividers;

    let xRange = [];

    let rects = this.attributes.append("g")
      .attr("transform", "translate(" + (this.columnScale(attribute) + 1 * bandwidth) + "," + (-legendHeight) + ")"); //

    for (let i = 0; i < dividers; i++) {
      let rect1 = rects
        .append('g')
        .attr('transform', 'translate(' + (i * (legendItemSize + margin)) + ',0)')

      xRange.push({
        "attr": attribute,
        "value": attributeInfo.domain[i],
        "position": (this.columnScale(attribute) + 1 * bandwidth) + (i * (legendItemSize + margin))
      });

      rect1
        .append('rect')
        .attr('x', 0)//(legendItemSize + margin)/2 -this.orderingScale.bandwidth()
        .attr('y', 0)
        .attr('fill', attributeInfo.range[i])
        .attr('width', legendItemSize)
        .attr('height', this.orderingScale.bandwidth())

      rect1
        .append('text')
        .text(attributeInfo.legendLabels[i])
        .attr('x', legendItemSize / 2)
        .attr('y', -3)
        .attr('text-anchor', 'middle')
        .style('font-size', 11)
      //.attr('transform', 'rotate(-90)')
    }

    return xRange;
  }

  /**
   * [selectHighlight description]
   * @param  nodeToSelect    the
   * @param  rowOrCol        String, "Row" or "Col"
   * @param  selectAttribute Boolean of to select attribute or topology highlight
   * @return                 [description]
   */
  selectHighlight(nodeToSelect: any, rowOrCol: string, attrOrTopo: string = "Attr", orientation: string = 'x') {
    let selection = d3.selectAll("." + attrOrTopo + rowOrCol)
      .filter((d, i) => {
        if (attrOrTopo == "Attr" && d.index == null) {
          // attr
          return nodeToSelect.index == d[i][orientation];
        }
        //topology
        return nodeToSelect.index == d.index;
      })
    return selection;
  }

  clicked(key) {

  }

  /**
   * Changes the current view to be a loading screen.
   * @return None
   */
  renderLoading() {
    d3.select('.loading')
    /*.style('opacity', 0)
    .style('display', 'block')
    .transition()
    .duration(1000)
    .style('opacity', 1);*/
  }

  /**
   * Changes the current view to hide the loading screen
   * @return None
   */
  hideLoading() {
    /*
    if (d3.select('.loading').attr('display') != "none") {
      d3.select('.loading')
        .transition()
        .duration(1000)
        .style('opacity', 0)
        .delay(1000)
        .style('display', 'none');
    }*/
  }

}

// Work on importing class file
class Controller {
  /*
  The Model handels the loading, sorting, and ordering of the data.
   */
  private view: any;
  private model: any;
  private configuration: any;

  setupExports(base, task) {
    d3.select("#exportBaseConfig").on("click", function() {
      exportConfig(Object.keys(base), Object.keys(base.adjMatrix), false)
    });

    d3.select("#exportConfig").on("click", function() {
      exportConfig(Object.keys(task), Object.keys(task.adjMatrixValues), true)
    });
  }
  setupCSS(base) {
    return;
    /*set css values for 'clicked' nodes;
    //set fill or stroke of selected node;

    //find the appropriate style sheet
    var sheet = Object.values(document.styleSheets).find(s =>
      s.href.includes("styles.css")
    );

    // let nodeIsRect = config.style.nodeShape === 'rect';
    // sheet.addRule(".node", (nodeIsRect? 'rx: 2; ry:2'  : 'rx:20; ry:20' ) , 1);

      let ruleString = "fill :" + base.style.selectedNodeColor +" !important;";
      sheet.addRule(".rect.selected", ruleString, 1);
      */

  }

  finishConstructing(config) {
    this.configuration = config;



    this.view = new View(this); // initalize view,
    this.model = new Model(this); // start reading in data

  }

  private tasks: any;
  private taskNum: number;

  loadTask(taskNum) {
    this.taskNum = taskNum;
    this.task = this.tasks[this.taskNum];
    this.configuration = this.task.config;
    //let prompt = 'Task ' + (this.taskNum + 1) + ' - ' + this.task.prompt;

    //this.configuration.adjMatrix.edgeBars = true;
    if (this.task.replyType.includes('singleNodeSelection') || this.task.replyType.includes('multipleNodeSelection')) {
      if (!this.configuration.nodeAttributes.includes('selected')) {
        this.configuration.nodeAttributes.unshift('selected');
        let obj = {
          "domain": [true, false],
          "range": ["#e86b45", '#fff'],
          "labels": ['answer', 'not answer'],
          'glyph': 'rect',
          'label': 'selected'
        }
        this.configuration.attributeScales.node['selected'] = obj;

      }


    }
    this.configuration.adjMatrix['toggle'] = false;
    //this.configuration.adjMatrix.neighborSelect = true;

    this.attrWidth = d3.min([125 * this.configuration.nodeAttributes.length, 650]);

    this.configuration.state = {}
    this.configuration.state.adjMatrix = {};
    if (this.configuration.adjMatrix.sortKey == null || this.configuration.adjMatrix.sortKey == '') {
      this.configuration.adjMatrix.sortKey = 'shortName'
    }

    this.sizeLayout();
    //configuration.adjMatrix.sortKey
    this.reload();

    // load data file
    // render vis from configurations
    // add observers and new provenance graph
    // create new field to store in fB?
  }
  async loadTasks() {
    this.taskNum = 0;
    this.tasks = taskList;
    // work here to disambiguate task stuff TODO
    /*
    let taskConfigs = await d3.json("./../../taskLists/am_large.json").then((data) => {
      //this.tasks = data.tasks;
      this.configuration = data.task1.config;
      this.tasks = [data.task1];

      let obj = {
        "domain": [true, false],
        "range": ["#e86b45", '#fff'],
        "labels": ['answer', 'not answer'],
        'glyph': 'rect',
        'label': 'selected'
      }

      //this.configuration = result;
      this.configuration.attributeScales.node['selected'] = obj;
      this.configuration.state = {}
      this.configuration.state.adjMatrix = {};
      this.configuration.adjMatrix.sortKey = 'shortName'
      //configuration.adjMatrix.sortKey
      this.reload();

    });*/

    //let taskConfig = "../configs/task" + (this.taskNum + 1).toString() + "Config.json";
    //if (this.tenAttr) {
    //  taskConfig = "../configs/10AttrConfig.json"
    //} else if (this.fiveAttr) {
    //  taskConfig = "../configs/5AttrConfig.json"
    //}

    //let that = this;
    /*
    Promise.all([
      d3.json("../configs/baseConfig.json"),
      d3.json(taskConfig),
      d3.json("../configs/state.json")
    ]).then((configComponents) => {
      /*that.setupCSS(configComponents[0]);
      that.setupExports(configComponents[0], configComponents[1]);
      let components = [configComponents[0], configComponents[1], configComponents[2]];
      let result = deepmerge.all(components);
*/
    // added selected attribute scale

    //that.finishConstructing(result);
    //})




  }
  private clickedCells: any;
  loadClearButton() {
    d3.select('#clearButton').on('click', () => {

      let action = {
        label: 'clear',
        action: () => {
          const currentState = this.model.app.currentState();
          //add time stamp to the state graph
          currentState.time = Date.now();
          currentState.event = 'clear';
          console.log("before Clear:", currentState)
          currentState.selections = {
            answerBox: {},
            attrRow: {},
            rowLabel: {},
            colLabel: {},
            cellcol: {},
            cellrow: {},
            search: {},
            neighborSelect: {}
          }
          console.log("after Clear:", currentState)
          return currentState;
        },
        args: []
      }
      this.model.provenance.applyAction(action);
      //pushProvenance(this.model.app.currentState())




      //this.view.renderHighlightNodesFromDict(this.clickedRow, 'clicked', 'Row');
      //this.view.renderHighlightNodesFromDict(this.clickedCol, 'clicked', 'Col');
      //this.view.renderHighlightNodesFromDict(this.answerRow, 'answer', 'Row');

      //this.view.renderHighlightNodesFromDict(this.clickedRow,'clicked','Row');
      //this.view.renderHighlightNodesFromDict(this.clickedRow,'clicked','Row');
      //that.renderHighlightNodesFromDict(this.controller.hoverRow, 'hovered', 'Row');

    })
  }

  private clickedRow: any;
  private clickedCol: any;
  private answerRow: any;
  private hoverRow: any;
  private hoverCol: any;

  sizeLayout() {
    let targetDiv = d3.select("#targetSize");
    let width = targetDiv.style("width").replace("px", ""),
      height = targetDiv.style("height").replace("px", "");
    let taskBarHeight = 74;
    let panelDimensions = {}
    panelDimensions.width = width * 0.2;
    panelDimensions.height = height - taskBarHeight;
    d3.select("#visPanel").style("width", panelDimensions.width + "px");
    d3.select('#panelDiv').style('display', 'none');
    document.getElementById("visContent").style.width = '100vw';
    document.getElementById("visContent").style.overflowX = "scroll";

    this.visHeight = panelDimensions.height;
    this.visWidth = width * 0.8 - 40;
    this.edgeWidth = this.visWidth - this.attrWidth;

    let filler = 0;
    if (panelDimensions.height < this.edgeWidth) {
      this.edgeWidth = panelDimensions.height;
      filler = this.visWidth - this.attrWidth - this.edgeWidth;
      this.visWidth = this.visWidth;
    }


    this.attributePorportion = this.attrWidth / (this.edgeWidth + this.attrWidth + filler);
    this.edgePorportion = this.edgeWidth / (this.edgeWidth + this.attrWidth + filler);

    if (this.edgeWidth < panelDimensions.height) {
      this.visHeight = this.visWidth * this.edgePorportion;
    }

    d3.select('.topocontainer').style('width', (100 * this.edgePorportion).toString() + '%');
    d3.select('.topocontainer').style('height', (this.visHeight).toString() + 'px');
    d3.select('.attrcontainer').style('width', (100 * this.attributePorportion).toString() + '%');
    d3.select('.attrcontainer').style('height', (this.visHeight).toString() + 'px');


    //d3.select('.adjMatrix.vis').style('width',width*0.8);
    d3.select('.adjMatrix.vis').style('width', (this.visWidth).toString() + 'px')
  }

  constructor() {
    this.clickedRow = {}
    this.clickedCol = {}
    this.answerRow = {}
    this.hoverRow = {}
    this.hoverCol = {}
    this.datumID = 'id';

    this.loadClearButton();
    this.loadTasks();
    // this.loadTask(0);
    this.sizeLayout();


    //this.loadConfigs();






  }
  clearView() {
    d3.select('.tooltip').remove();

    d3.select('#topology').selectAll('*').remove();
    d3.select('#attributes').selectAll('*').remove();
    d3.select('#legend-svg').selectAll('*').remove();

  }

  reload() {
    this.clearView();
    //this.loadCurrentTask();
    d3.select('.loading').style('display', 'block');

    this.view = new View(this); // initalize view,
    this.model = new Model(this); //.reload();
    this.tasks[this.taskNum].startTime = Date.now();
    //
    //this.model = new Model(this); // start reading in data
  }

  /**
   * Passes the processed edge and node data to the view.
   * @return None
   */
  loadData(nodes: any, edges: any, matrix: any) {
    this.view.loadData(nodes, edges, matrix);
  }

  /**
   * Obtains the order from the model and returns it to the view.
   * @return [description]
   */
  getOrder() {
    return this.model.getOrder();
  }

  /**
   * Obtains the order from the model and returns it to the view.
   * @return [description]
   */
  changeOrder(order: string) {
    this.configuration.adjMatrix.sortKey = order;
    return this.model.changeOrder(order);
  }


  // Add handlers to the view?

}

window.controller = new Controller();
//window.controller = control;
/* Deep merge stuff */
function isMergeableObject(val) {
  var nonNullObject = val && typeof val === 'object'

  return nonNullObject
    && Object.prototype.toString.call(val) !== '[object RegExp]'
    && Object.prototype.toString.call(val) !== '[object Date]'
}

function emptyTarget(val) {
  return Array.isArray(val) ? [] : {}
}

function cloneIfNecessary(value, optionsArgument) {
  var clone = optionsArgument && optionsArgument.clone === true
  return (clone && isMergeableObject(value)) ? deepmerge(emptyTarget(value), value, optionsArgument) : value
}

function defaultArrayMerge(target, source, optionsArgument) {
  var destination = target.slice()
  source.forEach(function(e, i) {
    if (typeof destination[i] === 'undefined') {
      destination[i] = cloneIfNecessary(e, optionsArgument)
    } else if (isMergeableObject(e)) {
      destination[i] = deepmerge(target[i], e, optionsArgument)
    } else if (target.indexOf(e) === -1) {
      destination.push(cloneIfNecessary(e, optionsArgument))
    }
  })
  return destination
}

function mergeObject(target, source, optionsArgument) {
  var destination = {}
  if (isMergeableObject(target)) {
    Object.keys(target).forEach(function(key) {
      destination[key] = cloneIfNecessary(target[key], optionsArgument)
    })
  }
  Object.keys(source).forEach(function(key) {
    if (!isMergeableObject(source[key]) || !target[key]) {
      destination[key] = cloneIfNecessary(source[key], optionsArgument)
    } else {
      destination[key] = deepmerge(target[key], source[key], optionsArgument)
    }
  })
  return destination
}

function deepmerge(target, source, optionsArgument) {
  var array = Array.isArray(source);
  var options = optionsArgument || { arrayMerge: defaultArrayMerge }
  var arrayMerge = options.arrayMerge || defaultArrayMerge

  if (array) {
    return Array.isArray(target) ? arrayMerge(target, source, optionsArgument) : cloneIfNecessary(source, optionsArgument)
  } else {
    return mergeObject(target, source, optionsArgument)
  }
}

function splitCellNames(name: string) {
  //remove cell
  let cleanedCellName = name.replace('cell', '');
  let ids = cleanedCellName.split('_');
  return ['cell' + ids[0] + '_' + ids[1], 'cell' + ids[1] + '_' + ids[0]]
}
