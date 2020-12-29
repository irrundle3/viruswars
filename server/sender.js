module.exports = function(){
  this.sendEditVirus = function(viruses,fogids,socket1,socket2){
    var pack = [];
    for(v in viruses){
      pack.push({
        id:viruses[v].id,
        mlx:Math.floor(viruses[v].move_loc_x),
        mly:Math.floor(viruses[v].move_loc_y),
      });
    }
    var b = filterPack(pack,fogids.blue);
    var r = filterPack(pack,fogids.red);
    if(b.length > 0)
      socket1.emit('edit_virus',b);
    if(r.length > 0)
      socket2.emit('edit_virus',r);
  }
  this.sendDestroyVirus = function(viruses,fogids,socket1,socket2){
    var pack = [];
    for(v in viruses){
      pack.push(viruses[v].id);
    }
    socket1.emit('destroy_virus',pack);
    socket2.emit('destroy_virus',pack);
    //console.log("dv: " + pack.toString());
  }
  this.sendStopVirus = function(viruses,fogids,socket1,socket2){
    var pack = [];
    for(v in viruses){
      pack.push(Object.assign({},{id:viruses[v].id,x:Math.floor(viruses[v].x),y:Math.floor(viruses[v].y)}));
    }
    var b = filterPack(pack,fogids.blue);
    var r = filterPack(pack,fogids.red);
    if(b.length > 0)
      socket1.emit('stop_virus',b);
    if(r.length > 0)
      socket2.emit('stop_virus',r);
  }
  this.sendCreateVirus = function(viruses,fogids,socket1,socket2){
    var pack = [];
    for(v in viruses){
      pack.push({id:viruses[v].id,mlx:Math.floor(viruses[v].move_loc_x),mly:Math.floor(viruses[v].move_loc_y),x:Math.floor(viruses[v].x),y:Math.floor(viruses[v].y),color:viruses[v].color});
      //console.log({id:viruses[v].id,mlx:viruses[v].move_loc_x,mly:viruses[v].move_loc_y,x:viruses[v].x,y:viruses[v].y,color:viruses[v].color});
    }
    var b = filterPack(pack,fogids.blue);
    var r = filterPack(pack,fogids.red);
    if(b.length > 0)
      socket1.emit('create_virus',b);
    if(r.length > 0)
      socket2.emit('create_virus',r);
    //console.log("cv: " + pack.toString());
  }
  this.sendEditCell = function(cells,fogids,socket1,socket2){
    var pack = [];
    for(c in cells){
      pack.push({id:cells[c].id,claim:cells[c].claim,hp:cells[c].hp});
    }
    var b = filterPack(pack,fogids.blue);
    var r = filterPack(pack,fogids.red);
    if(b.length > 0)
      socket1.emit('edit_cell',b);
    if(r.length > 0)
      socket2.emit('edit_cell',r);
    //console.log("ec: " + pack.toString());
  }
  this.sendWin = function(socketwin,socketlose){
    socketwin.emit('win');
    socketlose.emit('lose');
  }
}

var filterPack = function(pack,fogids){
/*  for(var p = 0; p < pack.length; p++){
    var stay = false;
    for(f in fogids){
      if(fogids[f]==pack[p].id){
        stay = true;
        break;
      }
    }
    if(!stay){
      pack = pack.slice(p,1);
    }
  }*/
  return pack;
}
