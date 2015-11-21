<?php

class Bootstrap extends Zend_Application_Bootstrap_Bootstrap
{
	public function _initBaseUrl()
	{
	    $baseUrl = $this->getOption('baseUrl');
	    Zend_Registry::set('baseUrl', $baseUrl);
	}
}

