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
        
        if (defined($previoususer) && $previoususer ne $user) {
            #calculate weight
            my $dt = $timestamp - $previoustimestamp;
            my $w = $dt <= $dtmax ? 1-$dt/$dtmax : 0;
            
            if ($w > 0) {
                #insert new revision edge or update weight if it exists
                my $sth = $dbh->prepare("SELECT weight FROM edge WHERE fromuser='$user' AND touser='$previoususer' AND article='$title';");
                $sth->execute;
                my @row = $sth->fetchrow_array;
                if (@row) {
                    $w += $row[0];
                    $dbh->do("UPDATE edge SET weight=$w WHERE fromuser='$user' AND touser='$previoususer' AND article='$title';");
                } 
                else {
                    $dbh->do("INSERT INTO edge VALUES ('$user', '$previoususer', $w, '$title');");
                }
            }
        }
        $previoususer = $user;
        $previoustimestamp = $timestamp;
    }
}

sub end_document{
    if (!@pagesread) {
        print "Article(s) not found. Exiting.\n";
        exit;
    }
    
    #call the evgen tool
    $0 =~ /(.+)\//;
    chdir($1);
    print "calculating eigenvectors....\n";
    foreach (@pagesread) {
        print `../evgen-bin/evgen "$_"` . "\n";
    }
    exit;
}

my $my_handler = MyHandler->new;
my $parser = XML::Parser::PerlSAX->new(Handler => $my_handler);
my $file = shift(@ARGV) or die "must specify a Mediawiki dump file";
$parser->parse(Source => {SystemId => $file});

