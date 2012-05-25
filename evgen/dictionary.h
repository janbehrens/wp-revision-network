#ifndef DICTIONARY_H
#define DICTIONARY_H

#include <iostream>
#include <map>

using namespace std;

//**************************************************//
// Map helper function
//**************************************************//
class Dictionary {
	public:
		//**************************************************//
		// Checks if the specified key exists
		//**************************************************//
		static bool Exists(map<string, double> item, const string& key) {
			map<string, double>::iterator it = item.find(key);
			return (it != item.end());
		}

		//**************************************************//
		// Checks if the specified key exists
		//**************************************************//
		static bool Exists(map<string, map<string, double>> item, const string& key) {
			map<string, map<string, double>>::iterator it = item.find(key);
			return (it != item.end());
		}
};

#endif