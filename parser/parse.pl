#!/usr/bin/perl
 
use strict;
use DBI;
use Text::CSV;
use Time::Local 'timelocal_nocheck';
use XML::Parser::PerlSAX;

package MyHandler;

shift(@ARGV) =~ /^(.+),(.+),(.+),(.+)$/;
my $dbh = DBI->connect("DBI:mysql:database=$1;host=$2", $3, $4) or die;
$dbh->{PrintError} = 0;

my $csv = Text::CSV->new({allow_whitespace => 1});  #the pages to be analysed
$csv->parse(shift(@ARGV));
my @pages = $csv->fields() or die;

my $dtmax = shift(@ARGV);  #maximum timestamp difference in seconds

my $user;
my $timestamp;
my $previoususer;
my $previoustimestamp;
my $parse;
my $tag;
my $title;
my @pagesread;

$| = 1;

sub date_sec2mysql {
	#takes: date in seconds since 1970 format
	#returns: date in yyyy-mm-dd hh:mm:ss format
	my $secdate = shift;
	my ($sec,$min,$hour,$mday,$mon,$year,$wday,$yday) = localtime($secdate);
	$year += 1900;
	$mon++;
	$mon = $mon < 10 ? "0$mon" : $mon;
	$mday = $mday < 10 ? "0$mday" : $mday;
	$sec = $sec < 10 ? "0$sec" : $sec;
	$min = $min < 10 ? "0$min" : $min;
	$hour = $hour < 10 ? "0$hour" : $hour;
	return qq{$year-$mon-$mday $hour:$min:$sec};
}

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
        if (!@pages) { end_document(); }
        undef $parse;
        undef $previoususer;
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
            print "reading $title...";

            @pages = grep $_ ne $title, @pages;
            push(@pagesread, $title);
            
            $dbh->do("DELETE FROM edge WHERE article='$title';");
        }
    }
    elsif ($tag eq 's') {
        #timestamp format: 2011-01-08T02:14:31Z
        $characters->{Data} =~ /^(\d+)-(\d+)-(\d+)T(\d+):(\d+):(\d+)Z$/;
        $timestamp = Time::Local::timelocal_nocheck($6, $5, $4, $3, $2-1, $1);
    }
    elsif ($tag eq 'u') {
        $user = $characters->{Data};
        
		my $date = date_sec2mysql($timestamp);
		$dbh->do("INSERT INTO entry VALUES ('$user', '$date', '$title');");

        $previoususer = $user;
        $previoustimestamp = $timestamp;
    }
}

sub end_document{
    if (!@pagesread) {
        print "Article(s) not found. Exiting.\n";
        exit;
    }
    exit;
}

my $my_handler = MyHandler->new;
my $parser = XML::Parser::PerlSAX->new(Handler => $my_handler);
my $file = shift(@ARGV) or die "must specify a Mediawiki dump file";
$parser->parse(Source => {SystemId => $file});

