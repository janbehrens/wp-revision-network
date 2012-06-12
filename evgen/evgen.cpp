// evgen.cpp : Defines the entry point for the console application.
//
#include "stdafx.h"
//#include <conio.h>
#include <sstream>
#include <string>
#ifdef _WIN32
	#include <my_global.h>
#endif
#include <mysql.h>
#include "adjacencymatrix.h"

const char *_article = "";
const char *_sid = "";

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
//* Stores the eigenvectors for the corresponding users in the database using the Eigen library
//******************************************************************************************
int storeEigenvectorsX(MYSQL *connection, Eigen::SelfAdjointEigenSolver<MatrixXd> es, AdjacencyMatrix *mat) {
	stringstream sql;
	sql << "SET SQL_SAFE_UPDATES = 0; DELETE FROM evgen WHERE sid = '" << _sid << "'; INSERT INTO evgen VALUES ('" << _sid << "', 0); "
		<< "DELETE FROM eigenvector WHERE article = '" << _article << "' and sid = '" << _sid << "'; "
		<< "DELETE FROM eigenvalue WHERE article = '" << _article << "' and sid = '" << _sid << "'; "
		<< "INSERT INTO eigenvalue (article, lambda1, lambda2, sid) VALUES ('" << _article 
		<< "', " << es.eigenvalues()[0]
		<< ", " << es.eigenvalues()[1]
		<< ", '" << _sid
		<< "'); ";

	Eigen::VectorXd v1 = es.eigenvectors().col(0);
	Eigen::VectorXd v2 = es.eigenvectors().col(1);
	
	map<string, unsigned int> m = mat->GetMatrixItems();
	map<string, unsigned int>::iterator it;
	for (it = m.begin(); it != m.end(); ++it) {
		sql << "INSERT INTO eigenvector VALUES ('" << it->first
			<< "', '" << _article
			<< "', " << v1.row(it->second)
			<< ", " << v2.row(it->second)
			<< ", '" << _sid
			<< "'); ";
	}
	sql << "UPDATE evgen SET finished = 1 WHERE sid = '" << _sid << "'; SET SQL_SAFE_UPDATES = 1;";
	string query = sql.str();

	int val = mysql_query(connection, query.c_str());
	if (val == 0) {
		MYSQL_RES *res = mysql_store_result(connection);
		mysql_free_result(res);
	}

	return val;
}

//******************************************************************************************
//* Main entry point
//******************************************************************************************
//int _tmain(int argc, wchar_t** argv) { //windows specific entry point
int main(int argc, char* argv[]) {
	if (argc < 3) {
		cout << "Error: Please provide the article name as argument and the session id!" << endl << endl;
		return EXIT_FAILURE;
	}
	bool debugOutput = false;
	if (argc > 3) {
		debugOutput = true;
	}
	_article = argv[1];
	_sid = argv[2];

	if (debugOutput) {
		cout << "Article: " << _article << endl;
		cout << "SID: " << _sid << endl;
	}

	MYSQL *connection, mysql;
	MYSQL_RES *result;
	AdjacencyMatrix *mat = new AdjacencyMatrix();

	mysql_init(&mysql);
	connection = mysql_real_connect(&mysql, "localhost", "root", "pw", "wpdump", 0, NULL, CLIENT_MULTI_STATEMENTS);
	if (connection == NULL) {
		fprintf(stderr, "Failed to connect to database: Error: %s\n",
			  mysql_error(&mysql));
		return 1;
	}

	//define query
	stringstream sql;
	sql << "SELECT * FROM edge e WHERE article = '" << _article << "' AND sid = '" << _sid << "';";
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

	if (debugOutput) {
		cout << "Items: " << mat->GetCount() << endl;
	}

	MatrixXd am = mat->GetAdjacencyMatrixXd();
	//empty matrix, abort
	if (am.count() == 0) {
		cout << 0 << endl;
		mysql_close(connection);
		delete(mat);
		return 0;
	}

	Eigen::SelfAdjointEigenSolver<MatrixXd> es(am);
	
	if (debugOutput) {
		cout << "Eigen-l1: " << es.eigenvalues()[0] << endl;
		cout << "Eigen-l2: " << es.eigenvalues()[1] << endl << endl;
		cout << es.eigenvectors().col(0) << endl << endl << es.eigenvectors().col(1) << endl;
	}

	if (es.eigenvalues().count() > 0) {
		storeEigenvectorsX(connection, es, mat);
		cout << mat->GetCount() << endl;
	} else {
		if (debugOutput) {
			cout << "No valid Eigenvectors found!\nAborting ... " << endl;
		} else {
			cout << 0 << endl;
		}
	}
	
	//mat->DebugTable("test.html");

	mysql_close(connection);
	delete(mat);
	return 0;
}

