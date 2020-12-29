# viruswars
 An online game where viruses infect cells and attempt to capture the map from the other players. Uses Nodejs and the socket.io library.
 Players start with one cell denoted as an O on the map, and viruses are generated at 1/sec. These viruses can be selected to infect other cells on the map.
 Each virus has a line of sight, so to explore the map, players must move viruses around!
 When two opposing viruses come into contact, they both disappear. To infect a cell, 100 viruses must be sacrificed to the cell. 
 To un-infect an opponent's cell, it takes 100 viruses, and to re-infect it to start generating your viruses, another 100 must be sacrificed.
 If your opponent has no more infected cells, you win the game!
