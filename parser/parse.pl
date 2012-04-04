#!/usr/bin/perl
 
use strict;
use DBI;
use XML::Parser::PerlSAX;

package MyHandler;

my $file = shift(@ARGV) or die "must specify a Mediawiki dump file";

my $dbh = DBI->connect("DBI:mysql:database=wpdump;host=localhost", 'root', 'pw') or die;
$dbh->{PrintError} = 0;

my $user;
my $userid;
my $timestamp;
my $previoususer;
my $previoususerid;
my $previoustimestamp;

my @pages = ('Iphepha Elingundoqo', 'Iinkonzo Zeelwimi Zesizwe');   #the pages you want
my $parse;
my $tag;

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
        undef $parse;
    }
    undef $tag;
}

sub characters {
    my ($self, $characters) = @_;
    if ($tag eq 't') {
        my $title = $characters->{Data};
        if (grep $_ eq $title, @pages) {
            $parse = 1;
            print "reading $title...";
        }
    }
    elsif ($tag eq 's') {
        $timestamp = $characters->{Data};
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
            #TODO: calculate weight
            my $w = 0;
            
            #insert new revision edge or update weight if it exists
            my $sth = $dbh->prepare("SELECT weight FROM edge WHERE fromuser='$userid' AND touser='$previoususerid';");
            $sth->execute;
            my @row = $sth->fetchrow_array;
            if (@row) {
                $w += $row[0];
                $dbh->do("UPDATE edge SET weight=$w WHERE fromuser=$userid AND touser=$previoususerid;");
            }
            else {
                $dbh->do("INSERT INTO edge VALUES ($userid, $previoususerid, $w);");
            }
        }

        $previoususer = $user;
        $previoususerid = $userid;
        $previoustimestamp = $timestamp;
    }
}

my $my_handler = MyHandler->new;
my $parser = XML::Parser::PerlSAX->new(Handler => $my_handler);
$parser->parse(Source => {SystemId => $file});

