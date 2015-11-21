<?php

class NewsletterController extends Zend_Controller_Action
{

    public function init()
    {
        /* Initialize action controller here */
    }

    public function indexAction()
    {
        // action body
    }

    public function subscribeAction(){
        $this->_helper->viewRenderer->setNoRender();
        $this->_helper->layout()->disableLayout();
        $params = $this->getRequest()->getParams();

        $this->getResponse()->setHeader('Content-Type', 'application/json');
        if (!filter_var($this->getRequest()->getPost('email'), FILTER_VALIDATE_EMAIL)) {
            $this->_helper->json(array('success'=>false));
        }
        $this->_helper->json(array('success'=>true));
    }


}
