#ifndef EDGE_H
#define EDGE_H

#include <iostream>

using namespace std;

//**************************************************//
// Map helper function
//**************************************************//
struct Edge {
	string from;
	string to;
	double weight;

	//**************************************************//
	// Init
	//**************************************************//
	Edge(string f, string t, double w) {
		from = f;
		to = t;
		weight = w;
	}
};

#endif