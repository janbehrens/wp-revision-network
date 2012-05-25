#ifndef ADJACENCYMATRIX_H
#define ADJACENCYMATRIX_H

#include <fstream>
#include <vector>
#include <map>
#include <iostream>
#include "linalg.h"

using namespace std;
using namespace alglib;

//**************************************************//
// AdjacencyMatrix
//**************************************************//
class AdjacencyMatrix {
	public:
		//**************************************************//
		// Initialize
		//**************************************************//
		AdjacencyMatrix() {
		}

		//**************************************************//
		// Add an item
		//**************************************************//
		void Add(const string& from, const string& to, const double& weight) {
			if (_matrix[from][to] == 0 && _matrix[to][from] == 0) {
				_matrix[from][to] = weight;
				_matrix[to][from] = weight;
			} else {
				_matrix[from][to] += weight;
				_matrix[to][from] += weight;
			}
			/*
			if (_matrix[from][to] == 0) {
				_matrix[from][to] = weight;		//create a key [from -> to] and assign the weight
				if (_matrix[to][from] == 0)
					_matrix[to][from] = 0;		//create a key [to -> from] with weight 0 (if the key does not exist)
			} else {
				_matrix[from][to] += weight;	//add/subtract the weight to the key [from -> to]
			}*/
		}

		//**************************************************//
		// Calculates the eigenvectors for the given matrix
		//**************************************************//
		real_2d_array GetAdjacencyMatrix() {
			int n = GetCount();
			unsigned int i = 0, j = 0;

			real_2d_array a;
			a.setlength(n, n);

			map<string, map<string, double>>::iterator rows;
			map<string, map<string, double>>::iterator cols;
			for(rows = _matrix.begin(); rows != _matrix.end(); ++rows) {
				string from = rows->first;
				for(cols = _matrix.begin(); cols != _matrix.end(); ++cols) {
					string to = cols->first;
					double val = _matrix[from][to]; 
					a(i, j++) = val;
				}
				i++;
				j = 0;
			}
			return a;
		}

		//**************************************************//
		// Gets the matrix items with key and index of the item
		//**************************************************//
		map<string, unsigned int> GetMatrixItems() {
			map<string, unsigned int> data;
			map<string, map<string, double>>::iterator rows;
			unsigned int i = 0;
			for(rows = _matrix.begin(); rows != _matrix.end(); ++rows) {
				data[rows->first] = i++;
			}
			return data;
		}

		//**************************************************//
		// Generates a table containing the data
		//**************************************************//
		void DebugTable(const string& file) {
			ofstream myfile;
			myfile.open(file);
			
			int i = 0, j = 0;
			myfile << "<table border=1 cellpadding=2 cellspacing=0 style='border-collapse:collapse;'>" << endl;

			//first generate column header
			myfile << "<tr><td>&nbsp;</td>";
			map<string, map<string, double>>::iterator rows;
			map<string, map<string, double>>::iterator cols;
			for(cols = _matrix.begin(); cols != _matrix.end(); ++cols) {
				myfile << "<td>" << cols->first << "</td>";
			}
			myfile << "</tr>" << endl;

			//no start with the matrix
			for(rows = _matrix.begin(); rows != _matrix.end(); ++rows) {
				string from = rows->first;
				myfile << "<tr>";
				myfile << "<td>" << from << "</td>";
				for(cols = _matrix.begin(); cols != _matrix.end(); ++cols) {
					string to = cols->first;
					if (_matrix[from][to] != 0) {
						myfile << "<td>" << _matrix[from][to] << "</td>";
					} else {
						myfile << "<td>0</td>";
					}
				}
				myfile << "</tr>";
			}
			
			myfile << "</table>" << endl;

			myfile.close();
		}

		//**************************************************//
		// Gets the number of items
		//**************************************************//
		unsigned int GetCount() {
			return _matrix.size();
		}

	private:
		map<string, map<string, double>> _matrix;
};

#endif