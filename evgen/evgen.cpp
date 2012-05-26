// evgen.cpp : Defines the entry point for the console application.
//
#include "stdafx.h"
#include <conio.h>
#include <sstream>
#include <string>
#include <my_global.h>
#include <mysql.h>
#include "AdjacencyMatrix.h"
#include <algorithm>

using namespace alglib;

char *_article = "Aussagenlogik";
typedef pair<double, int> evItem;

//******************************************************************************************
//* Comparator for sorting the eigenvalues
//******************************************************************************************
bool comparator(const evItem& l, const evItem& r) { 
	return l.first < r.first; 
}

//******************************************************************************************
//* Converts a double to a string
//******************************************************************************************
template <typename T>
string to_string(T const& value) {
    stringstream sstr;
    sstr << value;
    return sstr.str();
}

//******************************************************************************************
//* Gets the 2 minimal eigenvalues
//* - data [real_1d_array]: contains all eigenvalues (unordered)
//* @returns: a vector with 2 elements. Index 0 is the minimal eigenvalue, Index 1 is the 2nd
//******************************************************************************************
vector<evItem> getMinimalEigenvalues(const real_1d_array& data) {
	vector<evItem> eigenValues;
	
	vector<evItem> ev;
	for (int i = 0; i < data.length(); ++i) {
		ev.push_back(evItem(data[i], i));
	}
	sort(ev.begin(), ev.end(), comparator);

	vector<evItem>::iterator it;
	unsigned int i = 0;
	for (it = ev.begin(); it!=ev.end(); ++it) {
		if (i++ >= 2)
			break;

		eigenValues.push_back(evItem(it->first, it->second));
	}

	return eigenValues;
}

//******************************************************************************************
//* Stores the eigenvalues in the database
//* - connection [MYSQL]: the mysql connection
//* - items [vector]: contains the minimal and the 2nd minimal eigenvalues
//* @returns: 0 if saved
//******************************************************************************************
//int storeEigenvalues(MYSQL *connection, const vector<evItem>& items) {
//	string query = 
//		"DELETE FROM eigenvalue WHERE article = '{0}';"
//		"INSERT INTO eigenvalue (article, lambda1, lambda2) VALUES ('{0}', {1}, {2});";
//	query.replace(query.find("{0}"), 3, _article);
//	query.replace(query.find("{0}"), 3, _article);
//	query.replace(query.find("{1}"), 3, to_string(items[0].first));
//	query.replace(query.find("{2}"), 3, to_string(items[1].first));
//
//	int val = mysql_query(connection, query.c_str());
//	if (val == 0) {
//		MYSQL_RES *res = mysql_use_result(connection);
//		mysql_free_result(res);
//	}
//	return val;
//}

//******************************************************************************************
//* Stores the eigenvectors for the corresponding users in the database
//* - connection [MYSQL]: the mysql connection
//* - items [vector]: contains the minimal and the 2nd minimal eigenvalues
//* - ev [real_2d_array]: contains all eigenvectors
//* - a [real_2d_array]: the adjacency matrix
//* @returns: 0 if saved
//******************************************************************************************
int storeEigenvectors(MYSQL *connection, const vector<evItem>& items, const real_2d_array& ev, AdjacencyMatrix *mat) {
	int lambdaFirst = items[0].second;
	int lambdaSecond = items[1].second;

	stringstream sql;
	sql << "DELETE FROM eigenvalue WHERE article = '" << _article << "';"
		<< "INSERT INTO eigenvalue (article, lambda1, lambda2) VALUES ('" << _article 
		<< "', " << items[0].first 
		<< ", " << items[1].first
		<< ");"
		<< "SET SQL_SAFE_UPDATES = 0; DELETE FROM eigenvector WHERE article = '" << _article << "';";

	map<string, unsigned int> m = mat->GetMatrixItems();
	map<string, unsigned int>::iterator it;
	for (it = m.begin(); it != m.end(); ++it) {
		sql << "INSERT INTO eigenvector SELECT (SELECT id FROM user WHERE name = '" << it->first 
			<< "'), '" << _article
			<< "', " << ev[lambdaFirst][it->second] 
			<< ", " << ev[lambdaSecond][it->second]
			<< ";";
	}
	sql << "SET SQL_SAFE_UPDATES = 1;";
	string query = sql.str();

	int val = mysql_query(connection, query.c_str());
	if (val == 0) {
		MYSQL_RES *res = mysql_store_result(connection);
		mysql_free_result(res);
	}
	return val;
}

//******************************************************************************************
//* Creates a debug file with the basic positions
//******************************************************************************************
void debugGraph(const vector<evItem>& ev, const real_2d_array& vr) {
	double s = ev[1].first / ev[0].first;
	double r1 = 300;
	double r2 = s * r1;

	cout << "lambda min: " << ev[0].first << endl << "lambda min2: " << ev[1].first << endl;
	cout << "s: " << s << endl;

	stringstream file;
	file << _article << ".html";

	ofstream myfile;
	myfile.open(file.str());
	myfile << "<html>"
		"<head>"
		"	<style>"
		"		.i { position:absolute; width:3px; height:3px; overflow:hidden; background:#f00; }"
		"	</style>"
		"</head>"
		"<body>" << endl;

	for (unsigned int i = 0; i < vr.cols(); ++i) {
		double x = vr[ev[0].second][i];
		double y = s * vr[ev[1].second][i];
		double inv = sqrt(x * x + y * y);

		double xr = (inv != 0) ? r1 * x / inv : 0;
		double yr = (inv != 0) ? r2 * y / inv : 0;

		myfile << "<div class='i' style='left:" << round(r1 + 20 + xr) << "px; top:" << round(r1 + 20 + yr) << "px;'>x</div>" << endl;
		//cout << "P[" << r1 + xr << "; " << r1 + yr << "], I = " << inv << endl;
	}
	myfile << "</body></html>";

	myfile.close();
}

//******************************************************************************************
//* Main entry point
//******************************************************************************************
//int _tmain(int argc, wchar_t** argv) { //windows specific entry point
int main(int argc, char* argv[]) {
	if (argc < 2) {
		cout << "Error: Please provide the article name as argument!" << endl << endl;
		return EXIT_FAILURE;
	}
	_article = argv[1];
	cout << "Article: " << _article << endl;

	MYSQL *connection, mysql;
	MYSQL_RES *result;
	AdjacencyMatrix *mat = new AdjacencyMatrix();

	mysql_init(&mysql);
	connection = mysql_real_connect(&mysql, "localhost", "root", "test1t", "test", 0, NULL, CLIENT_MULTI_STATEMENTS);
	if (connection == NULL) {
		fprintf(stderr, "Failed to connect to database: Error: %s\n",
			  mysql_error(&mysql));
		return 1;
	}

	//define query
	stringstream sql;
	sql << 
		"SELECT u.name as fromuser, v.name as touser, e.weight "
		"FROM edge e "
		"JOIN user u ON e.fromuser = u.id "
		"JOIN user v ON e.touser = v.id "
		"WHERE weight > 0 AND article = '" << _article << "';";
	string ssql = sql.str();
	int queryResult = mysql_query(connection, ssql.c_str());
	//'Alan Smithee', 'Ang Lee', 'Aussagenlogik'
	
	//generate data
	if (queryResult == 0) {
		MYSQL_ROW row;
		result = mysql_store_result(connection);
		
		while ((row = mysql_fetch_row(result)) != NULL) {
			mat->Add(row[0], row[1], atof(row[2]));
		}
		mysql_free_result(result);
	}

	cout << "Items: " << mat->GetCount() << endl;

	//now the adjacency matrix, eigenvalues and eigenvectors are generated
	//mat->DebugTable("test.html");
	//http://www.alglib.net/translator/man/manual.cpp.html#sub_rmatrixevd
	real_2d_array a = mat->GetAdjacencyMatrix();	
	ae_int_t vNeeded = 3;							//both eigenvectors are returned
	ae_int_t n = mat->GetCount();					//size of the matrix
	real_1d_array wr;								//real parts of the eigenvalues
    real_1d_array wi;								//imaginary parts
    real_2d_array vl;								//left eigenvectors
    real_2d_array vr;								//right eigenvectors
	
	if (rmatrixevd(a, n, vNeeded, wr, wi, vl, vr)) {
		vector<evItem> ev = getMinimalEigenvalues(wr);

		cout << "Eigenvectors and Eigenvalues saved: " << ((storeEigenvectors(connection, ev, vr, mat) == 0) ? "yes" : "no") << endl;
		cout << mysql_error(connection) << endl;
		
		debugGraph(ev, vr);

		cout << "Finished" << endl;
		mysql_close(connection);
	} else {
		cout << "EVD-Calculation failed" << endl;
		mysql_close(connection);
		return 1;
	}
	
	delete(mat);
	return 0;
}

