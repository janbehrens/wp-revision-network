#!/usr/bin/perl
 
use strict;
use DBI;
use XML::Parser::PerlSAX;
use Time::Local 'timelocal_nocheck';
use Text::CSV;

package MyHandler;

shift(@ARGV) =~ /^(.+),(.+),(.+),(.+)$/;
my $dbh = DBI->connect("DBI:mysql:database=$1;host=$2", $3, $4) or die;
$dbh->{PrintError} = 0;

my $csv = Text::CSV->new({allow_whitespace => 1});  #the pages to be analysed
$csv->parse(shift(@ARGV));
my @pages = $csv->fields() or die;

my $dtmax = shift(@ARGV);  #maximum timestamp difference in seconds

my $user;
my $userid;
my $timestamp;
my $previoususer;
my $previoususerid;
my $previoustimestamp;
my $parse;
my $tag;
my $title;

sub new {
    my ($type) = @_;
    return bless {}, $type;
}

sub start_element {
    my ($self, $element) = @_;
    if ($element->{Name} =~ /^title$/) {
        $tag = 't';
    }
    elsif ($parse && $element->{Name} =~ /^timestamp$/) {
        $tag = 's';
    }
    elsif ($parse && $element->{Name} =~ /^(username|ip)$/) {
        $tag = 'u';
    }
}

sub end_element {
    my ($self, $element) = @_;
    if ($element->{Name} =~ /^page$/) {
        if ($parse) { print " done.\n"; }
        if (!@pages) { exit; }
        undef $parse;
        undef $previoususer;
        undef $previoususerid;
        undef $previoustimestamp;
    }
    undef $tag;
}

sub characters {
    my ($self, $characters) = @_;
    if ($tag eq 't') {
        $title = $characters->{Data};
        if (grep $_ eq $title, @pages) {
            $parse = 1;
            @pages = grep $_ ne $title, @pages;
            print "reading $title...";
        }
    }
    elsif ($tag eq 's') {
        $characters->{Data} =~ /^(\d+)-(\d+)-(\d+)T(\d+):(\d+):(\d+)Z$/;  #timestamp format: 2011-01-08T02:14:31Z
        $timestamp = Time::Local::timelocal_nocheck($6, $5, $4, $3, $2-1, $1);
        #print "\n$timestamp - ".localtime($timestamp);
    }
    elsif ($tag eq 'u') {
        $user = $characters->{Data};
        
        #insert user and get id
        $dbh->do("INSERT INTO user VALUES (DEFAULT, '$user');");
        my $sth = $dbh->prepare("SELECT id FROM user WHERE name='$user';");
        $sth->execute;
        my @row = $sth->fetchrow_array;
        $userid = $row[0];
        
        if (defined($previoususer) && $previoususer ne $user) {
            #calculate weight
            my $dt = $timestamp - $previoustimestamp;
            my $w = $dt <= $dtmax ? 1-$dt/$dtmax : 0;
            
            #insert new revision edge or update weight if it exists
            my $sth = $dbh->prepare("SELECT weight FROM edge WHERE fromuser=$userid AND touser=$previoususerid;");
            $sth->execute;
            my @row = $sth->fetchrow_array;
            if (@row) {
                $w += $row[0];
                $dbh->do("UPDATE edge SET weight=$w WHERE fromuser=$userid AND touser=$previoususerid;");
            }
            else {
                $dbh->do("INSERT INTO edge VALUES ($userid, $previoususerid, $w, '$title');");
            }
        }
        $previoususer = $user;
        $previoususerid = $userid;
        $previoustimestamp = $timestamp;
    }
}

my $my_handler = MyHandler->new;
my $parser = XML::Parser::PerlSAX->new(Handler => $my_handler);
my $file = shift(@ARGV) or die "must specify a Mediawiki dump file";
$parser->parse(Source => {SystemId => $file});

