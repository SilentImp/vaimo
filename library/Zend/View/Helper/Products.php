<?php
/**
 * Zend Framework
 *
 * LICENSE
 *
 * This source file is subject to the new BSD license that is bundled
 * with this package in the file LICENSE.txt.
 * It is also available through the world-wide-web at this URL:
 * http://framework.zend.com/license/new-bsd
 * If you did not receive a copy of the license and are unable to
 * obtain it through the world-wide-web, please send an email
 * to license@zend.com so we can send you a copy immediately.
 *
 * @category   Zend
 * @package    Zend_View
 * @subpackage Helper
 * @copyright  Copyright (c) 2005-2011 Zend Technologies USA Inc. (http://www.zend.com)
 * @version    $Id: Cycle.php 23953 2011-05-03 05:47:39Z ralph $
 * @license    http://framework.zend.com/license/new-bsd     New BSD License
 */

/**
 * Helper for alternating between set of values
 *
 * @package    Zend_View
 * @subpackage Helper
 * @copyright  Copyright (c) 2005-2011 Zend Technologies USA Inc. (http://www.zend.com)
 * @license    http://framework.zend.com/license/new-bsd     New BSD License
 */
class Zend_View_Helper_Products extends Zend_View_Helper_Abstract
{

    public function products()
    {
        $products = array( 
                        array(
                            id => 100,
                            title => "Leather Belt",
                            image => "images/product.png",
                            price => 24.9,
                            special_price => ""
                            ),
                        array(
                            id => 101,
                            title => "Fantastic Bag",
                            image => "images/product.png",
                            price => 539,
                            special_price => ""
                            ),
                        array(
                            id => 102,
                            title => "Arnolds's Gloves",
                            image => "images/product.png",
                            price => 99.9,
                            special_price => 59.9
                            ),
                        array(
                            id => 103,
                            title => "Zues Hammer",
                            image => "images/product.png",
                            price => 44.9,
                            special_price => ""
                            )
                    );
        return $products;
    }

}
