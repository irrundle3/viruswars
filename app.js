var express = require('express');
require('./server/sender.js')();
var app = express();
var serv = require('http').Server(app);

app.get('/',function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));

serv.listen(2000);
console.log("Server started.");

var SOCKET_LIST = {};
var VIRUS_SPEED = 17; //pixels per second
var FRAMERATE = 30; //fps
var DISPERSION_AREA = 6;
var DEBUG = true;
var DISPERSION_TIME = 2; //maximum time (sec) of virus dispersion

var Player = function(ids){
  var self = {
    id:ids,
    username:"No name",
    waiting:false,
  };
  Player.list[ids] = self;
  return self;
};

var Game = function(player1, player2, ids){
  var self = {
    id:ids,
    cells:[],
    viruses:[],
    player1:player1,
    player2:player2,
    started:false,
    ticker:0,
    redvc:100,
    bluevc:100,
    send:{ev:[],dv:[],sv:[],cv:[],ec:[]},
    fogids:{red:[],blue:[]},
    oldfogids:{red:[],blue:[]},
  };
  self.cells.push(Cell(Math.random(),250,50,"blue"));
  self.cells.push(Cell(Math.random(),250,250,"unclaimed"));
  self.cells.push(Cell(Math.random(),250,450,"red"));
  self.cells.push(Cell(Math.random(),50,150,"unclaimed"));
  self.cells.push(Cell(Math.random(),50,350,"unclaimed"));
  self.cells.push(Cell(Math.random(),450,150,"unclaimed"));
  self.cells.push(Cell(Math.random(),450,350,"unclaimed"));
  var vir;
  for(var v = 0; v < 125; v++){
    vir = Virus(Math.random(),250,50,"blue");
    vir.passive_move = FRAMERATE * DISPERSION_TIME * Math.random();
    vir.move_loc_x = vir.x + (DISPERSION_AREA*Math.sqrt( -2.0 * Math.log( Math.random()+.000001 ) ) * Math.cos( 2.0 * Math.PI * Math.random()+.000001 ));
    vir.move_loc_y = vir.y + (DISPERSION_AREA*Math.sqrt( -2.0 * Math.log( Math.random()+.000001 ) ) * Math.cos( 2.0 * Math.PI * Math.random()+.000001 ));
    self.viruses.push(vir);
    vir = Virus(Math.random(),250,450,"red");
    vir.passive_move = FRAMERATE * DISPERSION_TIME * Math.random();
    vir.move_loc_x = vir.x + (DISPERSION_AREA*Math.sqrt( -2.0 * Math.log( Math.random()+.000001 ) ) * Math.cos( 2.0 * Math.PI * Math.random()+.000001 ));
    vir.move_loc_y = vir.y + (DISPERSION_AREA*Math.sqrt( -2.0 * Math.log( Math.random()+.000001 ) ) * Math.cos( 2.0 * Math.PI * Math.random()+.000001 ));
    self.viruses.push(vir);
  }
  Game.list[ids] = self;
  return self;
};

var FullClientMap = function(game){
  truncated_viruses = {};
  for(v in game.viruses){
    truncated_viruses[game.viruses[v].id] =
      {
        id:game.viruses[v].id,
        x:Math.floor(game.viruses[v].x),
        y:Math.floor(game.viruses[v].y),
        color:game.viruses[v].color,
        mlx:game.viruses[v].move_loc_x,
        mly:game.viruses[v].move_loc_y,
        //angle:angle,
      };
  }
  var self = {
    cells:game.cells,
    viruses:truncated_viruses,
    my_color:"blue",
    blue_user:"",
    red_user:"",
  }
  self.fog = function(fogid){
    console.log('done');
    var r = self;
    for(v in r.viruses){
      var stay = false;
      for(f in fogid){
        if(fogid[f]==r.viruses[v].id){
          stay = true;
          break;
        }
      }
      if(!stay){
        delete r.viruses[v];
      }
    }
    return r;
  };
  return self;
};

Game.onInit = function(player1,player2){
  console.log('game initiating...');
  var game_id = Math.random();
  game = Game(player1,player2,game_id);
  game = fogOfWar(game);
  var client_map = FullClientMap(game);
  client_map.red_user=player2.username;
  client_map.blue_user=player1.username;
  console.log(game.fogids);
  SOCKET_LIST[player1.id].emit('fullGameUpdate',client_map);//.fog(game.fogids.blue));
  client_map = FullClientMap(game);
  client_map.red_user=player2.username;
  client_map.blue_user=player1.username;
  client_map.my_color = "red";
  SOCKET_LIST[player2.id].emit('fullGameUpdate',client_map);//.fog(game.fogids.red));
  game.started = true;
  SOCKET_LIST[player1.id].on('command',function(data){
    console.log('command recieved from player1: ' + player1.username);
    for(v in Game.list[game_id].viruses){
      for(ids in data.virus_ids){
        if(Game.list[game_id].viruses[v].color == "blue" && Game.list[game_id].viruses[v].id == data.virus_ids[ids]){
          Game.list[game_id].viruses[v].move_to = data.move_to;
          Game.list[game_id].viruses[v].move_cell = data.move_cell;
          Game.list[game_id].viruses[v].move_loc_x = data.move_loc_x;
          Game.list[game_id].viruses[v].move_loc_y = data.move_loc_y;
          Game.list[game_id].viruses[v].move_cell_id = data.move_cell_id;
          Game.list[game_id].send.ev.push(Game.list[game_id].viruses[v]);
        }
      }
    }
  });
  SOCKET_LIST[player2.id].on('command',function(data){
    console.log('command recieved from player2: ' + player2.username);
    for(v in Game.list[game_id].viruses){
      for(ids in data.virus_ids){
        if(Game.list[game_id].viruses[v].color == "red" && Game.list[game_id].viruses[v].id == data.virus_ids[ids]){
          Game.list[game_id].viruses[v].move_to = data.move_to;
          Game.list[game_id].viruses[v].move_cell = data.move_cell;
          Game.list[game_id].viruses[v].move_loc_x = data.move_loc_x;
          Game.list[game_id].viruses[v].move_loc_y = data.move_loc_y;
          Game.list[game_id].viruses[v].move_cell_id = data.move_cell_id;
          Game.list[game_id].send.ev.push(Game.list[game_id].viruses[v]);
        }
      }
    }
  });
  SOCKET_LIST[player1.id].on('help',function(data){
    console.log('help recieved');
    var client_map = FullClientMap(Game.list[game_id]);
    client_map.my_color = "blue";
    client_map.red_user = player2.username;
    client_map.blue_user = player1.username;
    SOCKET_LIST[player1.id].emit('fullGameUpdate',client_map);//.fog(Game.list[game_id].fogids.blue));
  });

  SOCKET_LIST[player2.id].on('help',function(data){
    console.log('help recieved');
    var client_map = FullClientMap(Game.list[game_id]);
    client_map.my_color = "red";
    client_map.red_user = player2.username;
    client_map.blue_user = player1.username;
    SOCKET_LIST[player2.id].emit('fullGameUpdate',client_map);//.fog(Game.list[game_id].fogids.red));
  });
};

var ClientMapUpdate = function(current){
  viruses_to_edit = [];
  cells_to_edit = [];
  for(v in current.viruses){
    if(current.viruses[v].edit){
      viruses_to_edit.push({
        id:current.viruses[v].id,
        x:Math.floor(current.viruses[v].x),
        y:Math.floor(current.viruses[v].y),
        color:current.viruses[v].color,
      });
    }
  }
  for(v in current.cells){
    cells_to_edit.push({
      x:Math.floor(current.cells[v].x),
      y:Math.floor(current.cells[v].y),
      id:current.cells[v].id,
      claim:current.cells[v].claim,
      hp:current.cells[v].hp,
    });
  }
  var self = {
    edited_viruses:viruses_to_edit,
    edited_cells:cells_to_edit,
  };
  return self;
};

var Cell = function(ids,x,y,claim){
  var self = {
    id:ids,
    x:x,
    y:y,
    claim:claim,
    hp:100,
  };
  if(claim == "unclaimed")
    self.hp = 0;
  return self;
};

var Virus = function(ids,x,y,color){
  var self = {
    id:ids,
    x:x,
    y:y,
    color:color,
    move_to:false,
    move_cell:false,
    move_loc_x:0,
    move_loc_y:0,
    move_cell_id:0,
    passive_move:0,
    edit:true,
  }
  return self;
}

Player.onConnect = function(socket){
  var player = Player(socket.id);
  console.log('socket connected');
  socket.on('sendUsername',function(data){
    console.log('sendUsername recieved...');
    var username = data;
    player.username = username;
    player.waiting = true;
    console.log('username sent: ' + username);
  });
};

Player.list = {};
Game.list = {};

Player.onDisconnect = function(socket){
  for(g in Game.list){
    if(Game.list[g].player1 == Player.list[socket.id]){
      SOCKET_LIST[Game.list[g].player2.id].emit('opponent_disconnected')
      delete Game.list[g].player2;
      delete Game.list[g];
    }else{
    if(Game.list[g].player2 == Player.list[socket.id]){
      SOCKET_LIST[Game.list[g].player1.id].emit('opponent_disconnected')
      delete Game.list[g].player1;
      delete Game.list[g];
    }
  }}
  delete Player.list[socket.id];
}

var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket){
  socket.id = Math.random();
  SOCKET_LIST[socket.id] = socket;

  Player.onConnect(socket);

  socket.on('disconnect',function(){
    Player.onDisconnect(socket);
    delete SOCKET_LIST[socket.id];
  });
});

function updateVirusCoords(non_updated_game){
  var game = non_updated_game;
  for(v in game.viruses){
    if(game.viruses[v].move_loc_x < 1){
      game.viruses[v].move_loc_x = 1;
    }
    if(game.viruses[v].move_loc_x > 499){
      game.viruses[v].move_loc_x = 499;
    }
    if(game.viruses[v].move_loc_y < 1){
      game.viruses[v].move_loc_y = 1;
    }
    if(game.viruses[v].move_loc_y > 499){
      game.viruses[v].move_loc_y = 499;
    }
    if(game.viruses[v].move_to || game.viruses[v].passive_move > 0){
      game.viruses[v].edit = true;
      if(game.viruses[v].passive_move > 0){
        game.viruses[v].passive_move = game.viruses[v].passive_move - 1;
      }
      var slope = (game.viruses[v].move_loc_y - game.viruses[v].y)/(game.viruses[v].move_loc_x - game.viruses[v].x);
      if(game.viruses[v].move_loc_x >= game.viruses[v].x){
        game.viruses[v].x += VIRUS_SPEED/(FRAMERATE*Math.sqrt(1+slope*slope));
        game.viruses[v].y += slope * VIRUS_SPEED/(FRAMERATE*Math.sqrt(1+slope*slope));
      }else{
        game.viruses[v].x -= VIRUS_SPEED/(FRAMERATE*Math.sqrt(1+slope*slope));
        game.viruses[v].y -= slope * VIRUS_SPEED/(FRAMERATE*Math.sqrt(1+slope*slope));
      }
      if(game.viruses[v].move_to && Math.abs(game.viruses[v].x - game.viruses[v].move_loc_x) < 5 && Math.abs(game.viruses[v].y - game.viruses[v].move_loc_y) < 5){
        game.viruses[v].move_to = false;
        var sx = (DISPERSION_AREA*Math.sqrt( -2.0 * Math.log( Math.random()+.000001 ) ) * Math.cos( 2.0 * Math.PI * Math.random()+.000001 ));
        var sy = (DISPERSION_AREA*Math.sqrt( -2.0 * Math.log( Math.random()+.000001 ) ) * Math.cos( 2.0 * Math.PI * Math.random()+.000001 ));
        game.viruses[v].passive_move = FRAMERATE * Math.sqrt(sx*sx+sy*sy) / VIRUS_SPEED;
        game.viruses[v].move_loc_x = game.viruses[v].x + sx;
        game.viruses[v].move_loc_y = game.viruses[v].y + sy;
        game.send.ev.push(game.viruses[v]);
      }
    }else if(game.viruses[v].move_cell){
      game.viruses[v].edit = true;
      var target = -1;
      for(c in game.cells){
        if(game.cells[c].id == game.viruses[v].move_cell_id){
          target = c;
        //  console.log('target acquired: id=' + game.cells[c].id);
          break;
        }
      }
      if(target != -1){
        if(game.viruses[v].x-5 < game.cells[target].x && game.viruses[v].x+5 > game.cells[target].x && game.viruses[v].y+5 > game.cells[target].y && game.viruses[v].y-5 < game.cells[target].y){
          if(game.cells[target].claim == "unclaimed"){
            game.cells[target].claim = game.viruses[v].color + "ing";
            game.cells[target].hp = 1;
            game.send.dv.push(game.viruses[v]);
            if(game.viruses[v].color == "blue"){
              game.bluevc--;
            }else{
              game.redvc--;
            }
            game.viruses.splice(v,1);
            game.send.ec.push(game.cells[target]);
          }else if(game.cells[target].claim == game.viruses[v].color + "ing"){
            game.cells[target].hp++;
            if(game.cells[target].hp > 99){
              game.cells[target].claim = game.viruses[v].color;
            }
            game.send.dv.push(game.viruses[v]);
            if(game.viruses[v].color == "blue"){
              game.bluevc--;
            }else{
              game.redvc--;
            }
            game.viruses.splice(v,1);
            game.send.ec.push(game.cells[target]);
          }else if(game.cells[target].claim == game.viruses[v].color){
            if(game.cells[target].hp < 100){
              game.cells[target].hp++;
              game.send.dv.push(game.viruses[v]);
              if(game.viruses[v].color == "blue"){
                game.bluevc--;
              }else{
                game.redvc--;
              }
              game.viruses.splice(v,1);
              game.send.ec.push(game.cells[target]);
            }else{
              game.viruses[v].move_cell = false;
              var sx = (DISPERSION_AREA*Math.sqrt( -2.0 * Math.log( Math.random()+.000001 ) ) * Math.cos( 2.0 * Math.PI * Math.random()+.000001 ));
              var sy = (DISPERSION_AREA*Math.sqrt( -2.0 * Math.log( Math.random()+.000001 ) ) * Math.cos( 2.0 * Math.PI * Math.random()+.000001 ));
              game.viruses[v].passive_move = FRAMERATE * Math.sqrt(sx*sx+sy*sy) / VIRUS_SPEED;
              game.viruses[v].move_loc_x = game.viruses[v].x + sx;
              game.viruses[v].move_loc_y = game.viruses[v].y + sy;
              game.send.ev.push(game.viruses[v]);
            }
          }else if(!game.cells[target].claim.includes(game.viruses[v].color)){
            game.cells[target].hp -= 1;
            if(game.cells[target].hp < 1){
              game.cells[target].hp = 0;
              game.cells[target].claim ="unclaimed";
            }
            game.send.dv.push(game.viruses[v]);
            if(game.viruses[v].color == "blue"){
              game.bluevc--;
            }else{
              game.redvc--;
            }
            game.viruses.splice(v,1);
            game.send.ec.push(game.cells[target]);
            }
          }else{
            game.viruses[v].move_loc_x = game.cells[target].x;
            game.viruses[v].move_loc_y = game.cells[target].y;
            game.send.ec.push(game.cells[target]);
            var slope = (game.viruses[v].move_loc_y - game.viruses[v].y)/(game.viruses[v].move_loc_x - game.viruses[v].x);
            if(game.viruses[v].move_loc_x >= game.viruses[v].x){
              game.viruses[v].x += VIRUS_SPEED/(FRAMERATE*Math.sqrt(1+slope*slope));
              game.viruses[v].y += slope * VIRUS_SPEED/(FRAMERATE*Math.sqrt(1+slope*slope));
            }else{
              game.viruses[v].x -= VIRUS_SPEED/(FRAMERATE*Math.sqrt(1+slope*slope));
              game.viruses[v].y -= slope * VIRUS_SPEED/(FRAMERATE*Math.sqrt(1+slope*slope));
            }
          }
        }
      }else{
        if(game.viruses[v].edit){
          game.viruses[v].edit = false;
          game.send.sv.push(game.viruses[v]);
        }
    }
  }
  return game;
}

var updateClient = function(send,fogids,socket1,socket2){
  if(send.ev.length != 0){
    sendEditVirus(send.ev,fogids,socket1,socket2);
    //console.log(send.ev);
    send.ev = [];
  }if(send.dv.length != 0){
    sendDestroyVirus(send.dv,fogids,socket1,socket2);
    send.dv = [];
  }if(send.sv.length != 0){
    sendStopVirus(send.sv,fogids,socket1,socket2);
    send.sv = [];
  }if(send.cv.length != 0){
    sendCreateVirus(send.cv,fogids,socket1,socket2);
    send.cv = [];
  }if(send.ec.length != 0){
    sendEditCell(send.ec,fogids,socket1,socket2);
    send.ec = [];
  }
  return send;
}

function createViruses(bad_game){
  var game = bad_game;
  game.ticker++;
  if(game.ticker > FRAMERATE){
    game.ticker = 0;
    var redc = 0;
    var bluec = 0;
    for(c in game.cells){
      var rand_id = Math.random();
      var rand_travel = Math.random();
      var virus
      if(game.cells[c].claim == "red"){
        if(game.redvc < 800){
          virus = Virus(rand_id,game.cells[c].x,game.cells[c].y,"red");
          virus.passive_move = FRAMERATE * DISPERSION_TIME * Math.random();
          virus.move_loc_x = game.cells[c].x + (DISPERSION_AREA*Math.sqrt( -2.0 * Math.log( Math.random()+.000001 ) ) * Math.cos( 2.0 * Math.PI * Math.random()+.000001 ));
          virus.move_loc_y = game.cells[c].y + (DISPERSION_AREA*Math.sqrt( -2.0 * Math.log( Math.random()+.000001 ) ) * Math.cos( 2.0 * Math.PI * Math.random()+.000001 ));
          game.viruses.push(virus);
          game.send.cv.push(virus);
          game.redvc++;
        }
        redc++;
      }
      if(game.cells[c].claim == "blue"){
        if(game.bluevc < 800){
          virus = Virus(rand_id,game.cells[c].x,game.cells[c].y,"blue");
          virus.passive_move = FRAMERATE * DISPERSION_TIME * Math.random();
          virus.move_loc_x = game.cells[c].x + (DISPERSION_AREA*Math.sqrt( -2.0 * Math.log( Math.random()+.000001 ) ) * Math.cos( 2.0 * Math.PI * Math.random()+.000001 ));
          virus.move_loc_y = game.cells[c].y + (DISPERSION_AREA*Math.sqrt( -2.0 * Math.log( Math.random()+.000001 ) ) * Math.cos( 2.0 * Math.PI * Math.random()+.000001 ));
          game.viruses.push(virus);
          game.send.cv.push(virus);
          game.bluevc++;
        }
        bluec++;
      }
    }
    if(redc == 0){
      sendWin(SOCKET_LIST[game.player1.id],SOCKET_LIST[game.player2.id])
    }
    if(bluec == 0){
      sendWin(SOCKET_LIST[game.player2.id],SOCKET_LIST[game.player1.id])
    }
  }
  return game;
}

var sortVirusesByX = function(viruses){
  function compare(as,bs){
    a = as.x;
    b = bs.x;
    let comparison = 0;
    if(a > b){
      comparison = 1;
    } else if (b > a) {
      comparison = -1;
    }
    return comparison;
  }
  return viruses.sort(compare)
};

var sortVirusesByY = function(viruses){
  function compare(as,bs){
    a = as.y;
    b = bs.y;
    let comparison = 0;
    if(a > b){
      comparison = 1;
    } else if (b > a) {
      comparison = -1;
    }
    return comparison;
  }
  return viruses.sort(compare)
};

var destroyViruses = function(old_game){
  var game = old_game;
  game.viruses = sortVirusesByX(game.viruses);
  for(var i = 0; i < game.viruses.length; i++){
    var tx = game.viruses[i].x;
    var ty = game.viruses[i].y;
    for(var j = i + 1; j < game.viruses.length; j++){
      if(Math.abs(game.viruses[i].x - game.viruses[j].x) < 6 && Math.abs(game.viruses[i].y - game.viruses[j].y) < 6 && game.viruses[i].color != game.viruses[j].color){
        try{
          game.send.dv.push(game.viruses[i]);
          game.send.dv.push(game.viruses[j]);
            game.bluevc--;
            game.redvc--;
          game.viruses.splice(j,1);
          game.viruses.splice(i,1);
          i--;
          break;
        }catch(err){
        }
      }
      else if(Math.abs(game.viruses[i].x - game.viruses[j].x) > 6){
        break;
      }
    }
  }
  return game;
};

var fogOfWar = function(game){
  var blue_grid = {};
  var red_grid = {};
  var neutral_grid = {};
  var blue_found = {};
  var red_found = {};
  var blue_fogids = [];
  var red_fogids = [];
  for(var v = 0; v < game.viruses.length; v++){
    if(game.viruses[v].x > 0 && game.viruses[v].x < 500 && game.viruses[v].y > 0 && game.viruses[v].y < 500){
      var val = 100*Math.floor(game.viruses[v].x/10)+Math.floor(game.viruses[v].y/10);
      if(game.viruses[v].color == "blue"){
        if(typeof blue_grid[val] === "undefined"){
          blue_grid[val] = {v:[]};
        }
        blue_grid[val].v.push(game.viruses[v]);
        blue_fogids.push(game.viruses[v].id);
      } else if(game.viruses[v].color == "red"){
        if(typeof red_grid[val] === "undefined"){
          red_grid[val] = {v:[]};
        }
        red_grid[val].v.push(game.viruses[v]);
        red_fogids.push(game.viruses[v].id);
      } else {
        blue_fogids.push(game.viruses[v].id);
        red_fogids.push(game.viruses[v].id);
      }
    }
  }
  for(var c in game.cells){
    var val = 100*Math.floor(game.cells[c].x/10)+Math.floor(game.cells[c].y/10);
    if(game.cells[c].claim == "blue"){
      if(typeof blue_grid[val] === "undefined"){
        blue_grid[val] = {v:[]};
      }
      blue_grid[val].v.push(game.cells[c]);
      blue_fogids.push(game.cells[c].id);
    } else if(game.cells[c].claim == "red"){
      if(typeof red_grid[val] === "undefined"){
        red_grid[val] = {v:[]};
      }
      red_grid[val].v.push(game.cells[c]);
      red_fogids.push(game.cells[c].id);
    } else {
      if(typeof neutral_grid[val] === "undefined"){
        neutral_grid[val] = {v:[]};
      }
      neutral_grid[val].v.push(game.cells[c]);
    }
  }
  var blue_grid2 = Object.assign({},blue_grid);
  var red_grid2 = Object.assign({},red_grid);
  //console.log("uhwi" + Object.keys(blue_grid2).length);
  for(var b in blue_grid){
    var bx = Math.floor(b/100);
    var by = b - bx*100;
    var foundopp = false;
    for(var r in red_grid){
      var rx = Math.floor(r/100);
      var ry = r - rx*100;
      if((rx-bx)*(rx-bx)+(ry-by)*(ry-by)<100){
        foundopp = true;
        for(var v in red_grid[r].v){
          blue_fogids.push(red_grid[r].v[v].id);
          red_found[r] = red_grid[r];
        }
      }
    }
    if(foundopp){
      blue_found[b] = blue_grid[b];
      for(var bb in blue_grid[b].v){
        red_fogids.push(blue_grid[b].v[bb].id);
      }
    }
  }
  for(var n in neutral_grid){
    var nx = Math.floor(n/100);
    var ny = n - nx*100;
    for(var b in blue_grid2){
      var bx = Math.floor(b/100);
      var by = b - bx*100;
      if((nx-bx)*(nx-bx)+(ny-by)*(ny-by)<100){
        for(var vvv in neutral_grid[n].v){
          blue_fogids.push(neutral_grid[n].v[vvv].id);
        }
      }
    }
    for(var r in red_grid2){
      var rx = Math.floor(r/100);
      var ry = r - rx*100;
      if((nx-rx)*(nx-rx)+(ny-ry)*(ny-ry)<100){
        for(var vv in neutral_grid[n].v){
          red_fogids.push(neutral_grid[n].v[vv].id);
        }
      }
    }
  }
  /*var timea = new Date();
  timea = timea.getTime();
  var blue_fogids = [];
  var red_fogids = [];
  var red_grid = [];
  var blue_grid = [];
  var blue_checked = [];
  var red_checked = [];
  for(var i = 0; i < 50; i++){
    red_grid.push([]);
    blue_grid.push([]);
    for(var j = 0; j < 50; j++){
      red_grid[i].push([]);
      blue_grid[i].push([]);
    }
  }
  var v = 0;
  for(v = 0; v < game.viruses.length; v++){
    if(game.viruses[v].x > 0 && game.viruses[v].x < 500 && game.viruses[v].y > 0 && game.viruses[v].y < 500){
      if(game.viruses[v].color == "blue"){
        blue_grid[Math.floor(game.viruses[v].x/10)][Math.floor(game.viruses[v].y/10)].push(game.viruses[v]);
        blue_fogids.push(game.viruses[v].id);
      } else if(game.viruses[v].color == "red"){
        red_grid[Math.floor(game.viruses[v].x/10)][Math.floor(game.viruses[v].y/10)].push(game.viruses[v]);
        red_fogids.push(game.viruses[v].id);
      } else {
        blue_fogids.push(game.viruses[v].id);
        red_fogids.push(game.viruses[v].id);
      }
    }
  }
  var timeb = new Date();
  timeb = timeb.getTime();
  console.log("1: " + (timeb-timea));
  var ticker = 0;
  for(var i = 0; i < blue_grid.length; i++){
    for(var j = 0; j < blue_grid[i].length; j++){
      if(blue_grid[i][j].length != 0){
        ticker++;
        var i2 = i-9;
        var j2 = j-9;
        if(i2 < 0){
          i2 = 0;
        }
        if(j2 < 0){
          j2 = 0;
        }
        for(var i2 = i-9; i2 < i+10; i2++){
          if(i2 > 0 && i2 < 50){
          for(var j2 = j-9; j2 < j+10; j2++){
            if(j2 > 0 && j2 < 50){
            if(!blue_checked.includes(i2 + j2 / 1000)){
              for(v in red_grid[i2][j2]){
                blue_fogids.push(red_grid[i2][j2][v].id);
              }
              var topush = i2 + j2 / 1000;
              blue_checked.push(topush);
            }
          }
          }
        }
        }
        var timef = new Date();
        timef = timef.getTime();
        for(var i2 = i+10; i2 < i+13; i2++){
          if(i2 > 0 && i2 < 50){
            for(var j2 = j - 3*(i2-i-13); j2 > j + 3*(i2-i-13) - 1; j2--){
              if(j2 > 0 && j2 < 50){
                if(!blue_checked.includes(i2 + j2 / 1000)){
                  for(v in red_grid[i2][j2]){
                    blue_fogids.push(red_grid[i2][j2][v].id);
                  }
                  var topush = i2 + j2 / 1000;
                  blue_checked.push(topush);
                }
              }
            }
          }
        }
        for(var i2 = i-10; i2 > i-13; i2--){
          if(i2 > 0 && i2 < 50){
            for(var j2 = j + 3*(9-i+i2); j2 < j - 3*(9-i+i2) + 1; j2++){
              if(j2 > 0 && j2 < 50){
                if(!blue_checked.includes(i2 + j2 / 1000)){
                  for(v in red_grid[i2][j2]){
                    blue_fogids.push(red_grid[i2][j2][v].id);
                  }
                  var topush = i2 + j2 / 1000;
                  blue_checked.push(topush);
                }
              }
            }
          }
        }
        for(var j2 = j+10; j2 < j+13; j2++){
          if(j2 > 0 && j2 < 50){
            for(var i2 = i - 3*(j2-j-13); i2 > i + 3*(j2-j-13) - 1; i2--){
              if(i2 > 0 && i2 < 50){
                if(!blue_checked.includes(i2 + j2 / 1000)){
                  for(v in red_grid[i2][j2]){
                    blue_fogids.push(red_grid[i2][j2][v].id);
                  }
                  var topush = i2 + j2 / 1000;
                  blue_checked.push(topush);
                }
              }
            }
          }
        }
        for(var j2 = j-10; j2 > j-13; j2--){
          if(j2 > 0 && j2 < 50){
            for(var i2 = i + 3*(9-j+j2); i2 < i - 3*(9-j+j2) + 1; i2++){
              if(i2 > 0 && i2 < 50){
                if(!blue_checked.includes(i2 + j2 / 1000)){
                  for(v in red_grid[i2][j2]){
                    blue_fogids.push(red_grid[i2][j2][v].id);
                  }
                  var topush = i2 + j2 / 1000;
                  blue_checked.push(topush);
                }
              }
            }
          }
        }
      }
    }
  }
  console.log('blue_checked.length: ' + blue_checked.length);
  var timec = new Date();
  timec = timec.getTime();
  console.log("2: " + (timec-timeb));
  for(var i = 0; i < red_grid.length; i++){
    for(var j = 0; j < red_grid[i].length; j++){
      if(red_grid[i][j].length != 0){
        for(var i2 = i-9; i2 < i+10; i2++){
          if(i2 > 0 && i2 < 50){
          for(var j2 = j-9; j2 < j+10; j2++){
            if(j2 > 0 && j2 < 50){
              if(!red_checked.includes(i2 + j2 / 1000)){
                for(v in blue_grid[i2][j2]){
                  red_fogids.push(blue_grid[i2][j2][v].id);
                }
                var topush = i2 + j2 / 1000;
                red_checked.push(topush);
              }
            }
          }
        }
      }
      for(var i2 = i+10; i2 < i+13; i2++){
        if(i2 > 0 && i2 < 50){
          for(var j2 = j - 3*(i2-i-13); j2 > j + 3*(i2-i-13) - 1; j2--){
            if(j2 > 0 && j2 < 50){
              if(!red_checked.includes(i2 + j2 / 1000)){
                for(v in blue_grid[i2][j2]){
                  red_fogids.push(blue_grid[i2][j2][v].id);
                }
                var topush = i2 + j2 / 1000;
                red_checked.push(topush);
              }
            }
          }
        }
      }
      for(var i2 = i-10; i2 > i-13; i2--){
        if(i2 > 0 && i2 < 50){
          for(var j2 = j + 3*(9-i+i2); j2 < j - 3*(9-i+i2) + 1; j2++){
            if(j2 > 0 && j2 < 50){
              if(!red_checked.includes(i2 + j2 / 1000)){
                for(v in blue_grid[i2][j2]){
                  red_fogids.push(blue_grid[i2][j2][v].id);
                }
                var topush = i2 + j2 / 1000;
                red_checked.push(topush);
              }
            }
          }
        }
      }
      for(var j2 = j+10; j2 < j+13; j2++){
        if(j2 > 0 && j2 < 50){
          for(var i2 = i - 3*(j2-j-13); i2 > i + 3*(j2-j-13) - 1; i2--){
            if(i2 > 0 && i2 < 50){
              if(!red_checked.includes(i2 + j2 / 1000)){
                for(v in blue_grid[i2][j2]){
                  red_fogids.push(blue_grid[i2][j2][v].id);
                }
                var topush = i2 + j2 / 1000;
                red_checked.push(topush);
              }
            }
          }
        }
      }
      for(var j2 = j-10; j2 > j-13; j2--){
        if(j2 > 0 && j2 < 50){
          for(var i2 = i + 3*(9-j+j2); i2 < i - 3*(9-j+j2) + 1; i2++){
            if(i2 > 0 && i2 < 50){
              if(!red_checked.includes(i2 + j2/ 1000)){
                for(v in blue_grid[i2][j2]){
                  red_fogids.push(blue_grid[i2][j2][v].id);
                }
                var topush = i2 + j2 / 1000;
                red_checked.push(topush);
              }
            }
          }
        }
      }
      }
    }
  }
  game.oldfogids = Object.assign({},game.fogids);
  game.fogids = {red:red_fogids,blue:blue_fogids};
  var timed = new Date();
  timed = timed.getTime();
  console.log("3: " + (timed-timec));*/
  //console.log(game.fogids.red.length + " " + game.fogids.blue.length);
  game.fogids = {red:red_fogids,blue:blue_fogids};
  //console.log("bf: " + blue_fogids.length);
  return game;
};

setInterval(function(){
  var waiting_username_list = [];
  for(var i in Player.list){
    if(Player.list[i].waiting){
      waiting_username_list.push(Player.list[i].username);
      //console.log(Player.list[i].username);
    }
  }
  if(waiting_username_list.length > 1){
    ilist = [];
    for(var i in Player.list){
      if(Player.list[i].waiting){
        Player.list[i].waiting = false;
        ilist.push(i);
      }
    }
    Game.onInit(Player.list[ilist[0]],Player.list[ilist[1]]);
  }
  for(var i in SOCKET_LIST){
    if(Player.list[i].waiting){
      var socket = SOCKET_LIST[i];
      socket.emit('updateWaitingUsers',waiting_username_list);
    }
  }
  //console.log("-------------------------------------------");
},1000/5);

let timerId = setTimeout(function tick() {
  for(game in Game.list){
    if(Game.list[game].started){
        Game.list[game].redvc = 0;
        Game.list[game].bluevc = 0;
        var d = new Date();
        d = d.getTime();
        //console.log('d');
        Game.list[game] = updateVirusCoords(Game.list[game]);
        var h = new Date();
        h = h.getTime();
        //console.log('h');
        Game.list[game] = createViruses(Game.list[game]);
        var g = new Date();
        g = g.getTime();
        //console.log('g');
        Game.list[game] = destroyViruses(Game.list[game]);
        var f = new Date();
        f = f.getTime();
      //  console.log('f');
        Game.list[game].send = updateClient(Game.list[game].send,Game.list[game].fogids,SOCKET_LIST[Game.list[game].player1.id],SOCKET_LIST[Game.list[game].player2.id]);
        var l = new Date();
        l = l.getTime();
        Game.list[game] = fogOfWar(Game.list[game]);
        var fo = new Date();
        fo = fo.getTime();
      //  console.log('fo');
        Game.list[game].bluevc=0;
        Game.list[game].redvc=0;
        for(v in Game.list[game].viruses){
          if(Game.list[game].viruses[v].color == "blue"){
            Game.list[game].bluevc++;
          }else{
            Game.list[game].redvc++;
          }
        }
        //console.log(Game.list[game].viruses);
      //  console.log('uc');
      //  console.log('bounds');
        var rfound = false;
        var bfound = false;
        for(v in Game.list[game].viruses){
          if(Game.list[game].viruses[v].color == "red" && !rfound){
            rfound = true;
            var vr = Game.list[game].viruses[v];
          }
          if(Game.list[game].viruses[v].color == "blue" && !bfound){
            bfound = true;
            var vb = Game.list[game].viruses[v];
          }
          if(rfound && bfound){
            break;
          }
        }
        //var va = Game.list[game].viruses[Math.floor(Game.list[game].viruses.length*Math.random())];
        if(rfound)
          SOCKET_LIST[Game.list[game].player2.id].emit('nf',vr);
        if(bfound)
          SOCKET_LIST[Game.list[game].player1.id].emit('nf',vb);
        //console.log(vv);
        SOCKET_LIST[Game.list[game].player1.id].emit('vc',{blue:Game.list[game].bluevc,red:Game.list[game].redvc});
        SOCKET_LIST[Game.list[game].player2.id].emit('vc',{blue:Game.list[game].bluevc,red:Game.list[game].redvc});
        var e = new Date();
        e = e.getTime();
        var delay = 1000/FRAMERATE - e + d;
        if(delay <= 0){
          delay = 0;
        }
        console.log("Process time: " + (e-d) + ", updateVirusCoords: " + (h-d) + ", createViruses: " + (g-h) + ", destroyViruses: " + (f-g) + ", fog: " + (fo-l)+ ", vc/nf: " + (e-fo));
      }
    }
  timerId = setTimeout(tick, delay); // (*)
}, 1000/FRAMERATE);

setInterval(function(){
  for(game in Game.list){
    SOCKET_LIST[Game.list[game].player1.id].emit('tf',Game.list[game].fogids.blue);
    SOCKET_LIST[Game.list[game].player2.id].emit('tf',Game.list[game].fogids.red);
  }
},100);
/*setInterval(function(){
  for(game in Game.list){
    if(Game.list[game].started){
      var client_map = FullClientMap(Game.list[game]);
      client_map.blue_user = Game.list[game].player1.username;
      client_map.red_user = Game.list[game].player2.username;
      //SOCKET_LIST[Game.list[game].player1.id].emit('fullGameUpdate',client_map);
      client_map.my_color = "red";
      //SOCKET_LIST[Game.list[game].player2.id].emit('fullGameUpdate',client_map);
    }
  }
},1000);*/
