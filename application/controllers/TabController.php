<?php

class TabController extends Zend_Controller_Action
{

    public function init()
    {
        /* Initialize action controller here */
    }

    public function indexAction()
    {
        // action body
    }
    
    public function tabcontentAction(){
    
       $this->_helper->viewRenderer->setNoRender();
       $this->_helper->layout()->disableLayout();
        

		    $arr = array( array( Title => "Women", 
                      Content => date("H:i:s") . " Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris sem ligula, luctus et aliquet eget, ultrices eu sem. Fusce enim lacus, sodales vel sollicitudin vitae, pretium non urna. Suspendisse scelerisque ligula at nulla gravida fringilla. Vivamus sed fermentum sem. Aenean volutpat porta dui, vel tempor diam. Curabitur non convallis diam. Ut mattis non ante nec pharetra. Praesent pulvinar mollis velit sit amet aliquam. Morbi vulputate tincidunt quam quis viverra. Fusce bibendum pulvinar turpis eu tristique. Proin et suscipit sapien.

Pellentesque tristique accumsan dui. Donec eu mattis elit. Etiam nisl felis, imperdiet vitae tempor sed, dignissim at arcu. Etiam eleifend urna ut lorem condimentum ultricies. In viverra quis metus ut imperdiet. Morbi enim odio, condimentum ut nibh sit amet, blandit mollis tellus. Nullam tincidunt diam purus, sed posuere lacus lobortis id. Nullam vestibulum mauris quis nisl commodo, quis ultricies tortor blandit. Morbi hendrerit ut justo et venenatis. Integer rutrum massa vel mi eleifend rutrum. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Sed molestie consectetur velit ut viverra. Phasellus turpis odio, posuere a tellus eget, interdum dictum nulla. Donec porta est lacinia lobortis sagittis. Ut ut ipsum tempus, fermentum libero et, tincidunt arcu. Nunc a diam urna. Phasellus lacinia, felis a fermentum laoreet, ipsum velit luctus mi, quis porttitor metus eros vitae orci. Phasellus dapibus nulla ultricies arcu gravida ornare. Duis vitae posuere enim. In quis feugiat nibh. Aliquam dictum velit suscipit leo lobortis ornare. Fusce pretium tellus sed felis feugiat rhoncus eu et magna. Aliquam erat volutpat. Ut ipsum enim, molestie id mi non, laoreet placerat tortor. Donec commodo, ipsum non dignissim condimentum, tortor orci sagittis eros, at hendrerit ligula elit in sapien.

Integer aliquet quam sem, eget aliquet nulla consequat at. Aenean commodo ante non sodales posuere. Cras commodo turpis nec sodales pellentesque. Donec tincidunt mauris dui, et adipiscing tortor gravida a. Etiam eget urna interdum massa suscipit vestibulum nec at ante. Aenean pharetra placerat lobortis. Nullam tincidunt interdum congue. Ut non enim mi. In sit amet justo vehicula, posuere enim eu, egestas leo. Maecenas blandit urna nunc, et elementum est euismod non. In imperdiet diam nec arcu cursus porta. Morbi consequat diam at quam convallis, vel rutrum nulla scelerisque.

Morbi aliquam orci quis nibh egestas, in suscipit erat volutpat. Donec at accumsan augue, sed elementum libero. Donec in fermentum mauris. Vivamus vestibulum, ligula eget molestie vehicula, risus ante faucibus libero, et pellentesque ipsum turpis sollicitudin erat. Nulla facilisi. Vivamus quis porta erat. Pellentesque vitae rutrum turpis. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Nulla sit amet aliquet sem, vel venenatis nulla. Suspendisse ac tortor iaculis, lobortis sapien non, sodales tortor. Suspendisse ipsum arcu, lobortis ac placerat quis, varius nec quam. Quisque vehicula mi ut diam ullamcorper blandit."
                    ),
               array( Title => "Men", 
                      Content => date("Ymd") . " Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris sem ligula, luctus et aliquet eget, ultrices eu sem. Fusce enim lacus, sodales vel sollicitudin vitae, pretium non urna. Suspendisse scelerisque ligula at nulla gravida fringilla. Vivamus sed fermentum sem. Aenean volutpat porta dui, vel tempor diam. Curabitur non convallis diam. Ut mattis non ante nec pharetra. Praesent pulvinar mollis velit sit amet aliquam. Morbi vulputate tincidunt quam quis viverra. Fusce bibendum pulvinar turpis eu tristique. Proin et suscipit sapien.

Pellentesque tristique accumsan dui. Donec eu mattis elit. Etiam nisl felis, imperdiet vitae tempor sed, dignissim at arcu. Etiam eleifend urna ut lorem condimentum ultricies. In viverra quis metus ut imperdiet. Morbi enim odio, condimentum ut nibh sit amet, blandit mollis tellus. Nullam tincidunt diam purus, sed posuere lacus lobortis id. Nullam vestibulum mauris quis nisl commodo, quis ultricies tortor blandit. Morbi hendrerit ut justo et venenatis. Integer rutrum massa vel mi eleifend rutrum. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Sed molestie consectetur velit ut viverra. Phasellus turpis odio, posuere a tellus eget, interdum dictum nulla. Donec porta est lacinia lobortis sagittis. Ut ut ipsum tempus, fermentum libero et, tincidunt arcu. Nunc a diam urna. Phasellus lacinia, felis a fermentum laoreet, ipsum velit luctus mi, quis porttitor metus eros vitae orci. Phasellus dapibus nulla ultricies arcu gravida ornare. Duis vitae posuere enim. In quis feugiat nibh. Aliquam dictum velit suscipit leo lobortis ornare. Fusce pretium tellus sed felis feugiat rhoncus eu et magna. Aliquam erat volutpat. Ut ipsum enim, molestie id mi non, laoreet placerat tortor. Donec commodo, ipsum non dignissim condimentum, tortor orci sagittis eros, at hendrerit ligula elit in sapien.

Integer aliquet quam sem, eget aliquet nulla consequat at. Aenean commodo ante non sodales posuere. Cras commodo turpis nec sodales pellentesque. Donec tincidunt mauris dui, et adipiscing tortor gravida a. Etiam eget urna interdum massa suscipit vestibulum nec at ante. Aenean pharetra placerat lobortis. Nullam tincidunt interdum congue. Ut non enim mi. In sit amet justo vehicula, posuere enim eu, egestas leo. Maecenas blandit urna nunc, et elementum est euismod non. In imperdiet diam nec arcu cursus porta. Morbi consequat diam at quam convallis, vel rutrum nulla scelerisque.

Morbi aliquam orci quis nibh egestas, in suscipit erat volutpat. Donec at accumsan augue, sed elementum libero. Donec in fermentum mauris. Vivamus vestibulum, ligula eget molestie vehicula, risus ante faucibus libero, et pellentesque ipsum turpis sollicitudin erat. Nulla facilisi. Vivamus quis porta erat. Pellentesque vitae rutrum turpis. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Nulla sit amet aliquet sem, vel venenatis nulla. Suspendisse ac tortor iaculis, lobortis sapien non, sodales tortor. Suspendisse ipsum arcu, lobortis ac placerat quis, varius nec quam. Quisque vehicula mi ut diam ullamcorper blandit."
                    ),
               array( Title => "Junior", 
                      Content => date("F j, Y, g:i a") . "  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris sem ligula, luctus et aliquet eget, ultrices eu sem. Fusce enim lacus, sodales vel sollicitudin vitae, pretium non urna. Suspendisse scelerisque ligula at nulla gravida fringilla. Vivamus sed fermentum sem. Aenean volutpat porta dui, vel tempor diam. Curabitur non convallis diam. Ut mattis non ante nec pharetra. Praesent pulvinar mollis velit sit amet aliquam. Morbi vulputate tincidunt quam quis viverra. Fusce bibendum pulvinar turpis eu tristique. Proin et suscipit sapien.

Pellentesque tristique accumsan dui. Donec eu mattis elit. Etiam nisl felis, imperdiet vitae tempor sed, dignissim at arcu. Etiam eleifend urna ut lorem condimentum ultricies. In viverra quis metus ut imperdiet. Morbi enim odio, condimentum ut nibh sit amet, blandit mollis tellus. Nullam tincidunt diam purus, sed posuere lacus lobortis id. Nullam vestibulum mauris quis nisl commodo, quis ultricies tortor blandit. Morbi hendrerit ut justo et venenatis. Integer rutrum massa vel mi eleifend rutrum. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Sed molestie consectetur velit ut viverra. Phasellus turpis odio, posuere a tellus eget, interdum dictum nulla. Donec porta est lacinia lobortis sagittis. Ut ut ipsum tempus, fermentum libero et, tincidunt arcu. Nunc a diam urna. Phasellus lacinia, felis a fermentum laoreet, ipsum velit luctus mi, quis porttitor metus eros vitae orci. Phasellus dapibus nulla ultricies arcu gravida ornare. Duis vitae posuere enim. In quis feugiat nibh. Aliquam dictum velit suscipit leo lobortis ornare. Fusce pretium tellus sed felis feugiat rhoncus eu et magna. Aliquam erat volutpat. Ut ipsum enim, molestie id mi non, laoreet placerat tortor. Donec commodo, ipsum non dignissim condimentum, tortor orci sagittis eros, at hendrerit ligula elit in sapien.

Integer aliquet quam sem, eget aliquet nulla consequat at. Aenean commodo ante non sodales posuere. Cras commodo turpis nec sodales pellentesque. Donec tincidunt mauris dui, et adipiscing tortor gravida a. Etiam eget urna interdum massa suscipit vestibulum nec at ante. Aenean pharetra placerat lobortis. Nullam tincidunt interdum congue. Ut non enim mi. In sit amet justo vehicula, posuere enim eu, egestas leo. Maecenas blandit urna nunc, et elementum est euismod non. In imperdiet diam nec arcu cursus porta. Morbi consequat diam at quam convallis, vel rutrum nulla scelerisque.

Morbi aliquam orci quis nibh egestas, in suscipit erat volutpat. Donec at accumsan augue, sed elementum libero. Donec in fermentum mauris. Vivamus vestibulum, ligula eget molestie vehicula, risus ante faucibus libero, et pellentesque ipsum turpis sollicitudin erat. Nulla facilisi. Vivamus quis porta erat. Pellentesque vitae rutrum turpis. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Nulla sit amet aliquet sem, vel venenatis nulla. Suspendisse ac tortor iaculis, lobortis sapien non, sodales tortor. Suspendisse ipsum arcu, lobortis ac placerat quis, varius nec quam. Quisque vehicula mi ut diam ullamcorper blandit."
                    )
             );

    echo json_encode($arr);
    }


}

