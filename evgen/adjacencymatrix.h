#ifndef ADJACENCYMATRIX_H
#define ADJACENCYMATRIX_H

#include <fstream>
#include <vector>
#include <map>
#include <iostream>
#ifdef _WIN32
	#include "Eigen\Eigenvalues"
#else
	#include "Eigen/Eigenvalues"
#endif

using namespace std;

using Eigen::MatrixXd;
using Eigen::EigenSolver;

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
				_matrix[from][to] += weight;
				_matrix[to][from] += weight;
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
		// Gets the adjacency matrix
		//**************************************************//
		MatrixXd GetAdjacencyMatrixXd() {
			int n = GetCount();
			unsigned int i = 0, j = 0;

			MatrixXd m(n, n);

			map<string, map<string, double> >::iterator rows;
			map<string, map<string, double> >::iterator cols;
			for(rows = _matrix.begin(); rows != _matrix.end(); ++rows) {
				string from = rows->first;
				for(cols = _matrix.begin(); cols != _matrix.end(); ++cols) {
					string to = cols->first;
					double val = _matrix[from][to]; 
					m(i, j++) = val;
				}
				i++;
				j = 0;
			}
			return m;
		}

		//**************************************************//
		// Gets the matrix items with key and index of the item
		//**************************************************//
		map<string, unsigned int> GetMatrixItems() {
			map<string, unsigned int> data;
			map<string, map<string, double> >::iterator rows;
			unsigned int i = 0;
			for(rows = _matrix.begin(); rows != _matrix.end(); ++rows) {
				data[rows->first] = i++;
			}
			return data;
		}

		//**************************************************//
		// Generates a table containing the data
		//**************************************************//
		void DebugTable(const char* file) {
			ofstream myfile;
			myfile.open(file);
			
			myfile << "<table border=1 cellpadding=2 cellspacing=0 style='border-collapse:collapse;'>" << endl;

			//first generate column header
			myfile << "<tr><td>&nbsp;</td>";
			map<string, map<string, double> >::iterator rows;
			map<string, map<string, double> >::iterator cols;
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
					myfile << "<td>" << _matrix[from][to] << "</td>";
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
		map<string, map<string, double> > _matrix;
};

#endif
