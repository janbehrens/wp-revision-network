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
const char *_wiki = "";
const char *_sid = "";
const char *_sd = "";
const char *_ed = "";
const char *_dmax = "";
const char *_dbhost = "localhost";
const char *_dbuser = "root";
const char *_dbpass = "pw";
const char *_dbname = "revnet";

ofstream debugfile;

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
	sql << "SET SQL_SAFE_UPDATES = 0; "
		<< "DELETE FROM evgen WHERE sid = '" << _sid << "'; "
		<< "INSERT INTO evgen VALUES ('" << _sid << "', 0); "
		<< "DELETE FROM eigenvector WHERE sid = '" << _sid << "'; "
		<< "DELETE FROM eigenvalue WHERE sid = '" << _sid << "'; "
		<< "INSERT INTO eigenvalue (lambda1, lambda2, article, wiki, dmax, sid) VALUES ("
		<< es.eigenvalues()[0] << ", "
		<< es.eigenvalues()[1] << ", "
		<< _article << ", '"
		<< _wiki << "', "
		<< _dmax << ", '"
		<< _sid << "'); ";

	Eigen::VectorXd v1 = es.eigenvectors().col(0);
	Eigen::VectorXd v2 = es.eigenvectors().col(1);

	map<string, unsigned int> m = mat->GetMatrixItems();
	map<string, unsigned int>::iterator it;
	for (it = m.begin(); it != m.end(); ++it) {
		sql << "INSERT INTO eigenvector VALUES ('"
			<< it->first << "', "
			<< v1.row(it->second) << ", "
			<< v2.row(it->second) << ", "
			<< _article << ", '"
			<< _wiki << "', "
			<< _dmax << ", '"
			<< _sid << "'); ";
	}
	sql << "UPDATE evgen SET finished = 1 WHERE sid = '" << _sid << "'; "
		<< "SET SQL_SAFE_UPDATES = 1; ";
	string query = sql.str();

	int val = mysql_query(connection, query.c_str());
	if (val == 0) {
		MYSQL_RES *res = mysql_store_result(connection);
		mysql_free_result(res);
	}
	else {
		cout << "Error: " << mysql_error(connection) << endl;
		debugfile << "Error: " << mysql_error(connection) << endl;
	}

	return val;
}

//******************************************************************************************
//* Main entry point
//******************************************************************************************
//int _tmain(int argc, wchar_t** argv) { //windows specific entry point
int main(int argc, char* argv[]) {
	if (argc < 7) {
		cout << "Error: Please provide article id, wiki name, start date, end date and session id as arguments!" << endl << endl;
		return EXIT_FAILURE;
	}
	bool debugOutput = false;
	if (argc > 7) {
		debugOutput = true;
	}
	_article = argv[1];
	_wiki = argv[2];
	_sd = argv[3];
	_ed = argv[4];
	_dmax = argv[5];
	_sid = argv[6];

	debugfile.open("evgendebug");

	if (debugOutput) {
		cout << "Article: " << _article << endl;
		cout << "Wiki: " << _wiki << endl;
		cout << "SID: " << _sid << endl;
		cout << "start date: " << _sd << endl;
		cout << "end date: " << _ed << endl;
		cout << "dmax: " << _dmax << endl;
		debugfile << "Article: " << _article << endl;
		debugfile << "Wiki: " << _wiki << endl;
		debugfile << "SID: " << _sid << endl;
		debugfile << "start date: " << _sd << endl;
		debugfile << "end date: " << _ed << endl;
		debugfile << "dmax: " << _dmax << endl;
	}

	MYSQL *connection, mysql;
	MYSQL_RES *result;
	AdjacencyMatrix *mat = new AdjacencyMatrix();

	//connect to database
	mysql_init(&mysql);
	mysql_options(&mysql, MYSQL_READ_DEFAULT_GROUP, "client");
	connection = mysql_real_connect(&mysql, _dbhost, _dbuser, _dbpass, _dbname, 0, NULL, CLIENT_MULTI_STATEMENTS);
	if (!connection) {
		cout << mysql_error(&mysql) << endl;
		debugfile << mysql_error(&mysql) << endl;
		return 1;
	}

	stringstream sql;
	string ssql;
	int queryResult;

	//select db
	int select = mysql_select_db(&mysql, _dbname);
	if (select != 0) {
		cout << mysql_error(&mysql) << endl;
		debugfile << mysql_error(&mysql) << endl;
		return 1;
	}

	//get revision edges
	sql.str("");
	sql << "SELECT fromuser, touser, SUM(weight) FROM edge "
		<< "WHERE article = " << _article << " AND wiki = '" << _wiki << "' AND dmax = " << _dmax;
	if (strcmp(_ed, "0") != 0) {
		sql << " AND timestamp > " << _sd << " AND timestamp < " << _ed;
	}
	sql << " GROUP BY fromuser, touser;";
	ssql = sql.str();
	queryResult = mysql_query(connection, ssql.c_str());

	//generate data
	if (queryResult == 0) {
		MYSQL_ROW row;
		result = mysql_store_result(connection);

		while ((row = mysql_fetch_row(result)) != NULL) {
			mat->Add(row[0], row[1], atof(row[2]));
		}
		mysql_free_result(result);
	}
	else {
		cout << "Error: " << mysql_error(&mysql) << endl;
		debugfile << "Error: " << mysql_error(&mysql) << endl;
	}

	if (debugOutput) {
		cout << "Items: " << mat->GetCount() << endl;
		debugfile << "Items: " << mat->GetCount() << endl;
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
		cout << "Eigen-l1: " << es.eigenvalues()[0];
		cout << endl;
		cout << "Eigen-l2: " << es.eigenvalues()[1];
		cout << endl << endl;
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

	/*if (debugOutput) {
		mat->DebugTable("test.html");
	}*/

	debugfile.close();

	mysql_close(connection);
	delete(mat);
	return 0;
}

